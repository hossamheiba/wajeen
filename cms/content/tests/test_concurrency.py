"""Optimistic concurrency per block, and the global publish lock."""

import threading
from unittest import mock

from django.db import connection, transaction
from django.test import TestCase, TransactionTestCase

from content.models import ContentBlock, ContentVersion
from content.services import publishing
from content.services.errors import ConcurrencyError
from content.services.patching import apply_patch

from .helpers import import_real_content


class BlockConcurrencyTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def test_two_editors_on_the_same_block_lose_the_race_loudly(self):
        version = ContentBlock.objects.get(namespace="hero", locale="en").version
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "first"},
                    expected_version=version)
        with self.assertRaises(ConcurrencyError):
            apply_patch(namespace="hero", locale="en", patch={"subtitle": "second"},
                        expected_version=version)

    def test_different_namespaces_never_conflict(self):
        hero = ContentBlock.objects.get(namespace="hero", locale="en")
        clients = ContentBlock.objects.get(namespace="clients", locale="en")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "a"},
                    expected_version=hero.version)
        apply_patch(namespace="clients", locale="en", patch={"tag": "b"},
                    expected_version=clients.version)
        self.assertTrue(ContentBlock.objects.get(namespace="hero", locale="en").has_draft)
        self.assertTrue(ContentBlock.objects.get(namespace="clients", locale="en").has_draft)

    def test_same_namespace_different_locales_never_conflict(self):
        english = ContentBlock.objects.get(namespace="hero", locale="en")
        arabic = ContentBlock.objects.get(namespace="hero", locale="ar")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "en"},
                    expected_version=english.version)
        apply_patch(namespace="hero", locale="ar", patch={"subtitle": "ar"},
                    expected_version=arabic.version)
        self.assertEqual(
            ContentBlock.objects.get(namespace="hero", locale="en").draft_data["subtitle"], "en"
        )
        self.assertEqual(
            ContentBlock.objects.get(namespace="hero", locale="ar").draft_data["subtitle"], "ar"
        )

    def test_block_version_is_not_the_publish_revision(self):
        """The two counters are unrelated on purpose."""
        block = apply_patch(
            namespace="hero", locale="en", patch={"subtitle": "x"},
            expected_version=ContentBlock.objects.get(namespace="hero", locale="en").version,
        )
        revision = publishing.current_version()
        self.assertEqual(revision.number, 1)
        self.assertGreater(block.version, revision.number)

    def test_publish_precondition_uses_the_global_revision(self):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "x"},
                    expected_version=block.version)
        with self.assertRaises(ConcurrencyError):
            publishing.publish(if_match=99)
        publishing.publish(if_match=1)
        self.assertEqual(publishing.current_version().number, 2)

    def test_publishing_against_a_superseded_revision_is_refused(self):
        first = ContentBlock.objects.get(namespace="hero", locale="en")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "one"},
                    expected_version=first.version)
        publishing.publish(if_match=1)

        second = ContentBlock.objects.get(namespace="clients", locale="en")
        apply_patch(namespace="clients", locale="en", patch={"tag": "two"},
                    expected_version=second.version)
        with self.assertRaises(ConcurrencyError):
            publishing.publish(if_match=1)


class ParallelPublishTests(TransactionTestCase):
    """Real threads, real transactions -- the in-transaction TestCase cannot show this."""

    reset_sequences = True

    def setUp(self):
        import_real_content()

    def test_only_one_of_two_racing_publishes_wins(self):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "racy"},
                    expected_version=block.version)

        outcomes: list[str] = []
        barrier = threading.Barrier(2)

        def attempt():
            barrier.wait()
            try:
                publishing.publish(if_match=1)
                outcomes.append("ok")
            except Exception as exc:
                outcomes.append(type(exc).__name__)
            finally:
                connection.close()

        threads = [threading.Thread(target=attempt) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(outcomes.count("ok"), 1, outcomes)
        self.assertEqual(ContentVersion.objects.filter(is_current=True).count(), 1)
        self.assertEqual(ContentVersion.objects.count(), 2)

    def test_the_database_refuses_a_second_current_revision(self):
        """Not application logic -- a partial unique index."""
        current = ContentVersion.objects.get(is_current=True)
        with self.assertRaises(Exception):
            with transaction.atomic():
                ContentVersion.objects.create(
                    number=current.number + 1, snapshot={}, is_current=True
                )
        self.assertEqual(ContentVersion.objects.filter(is_current=True).count(), 1)


class PatchDuringPublishTests(TransactionTestCase):
    """Can a draft be cleared or overwritten by a publish running beside it?

    Publish takes SELECT ... FOR UPDATE over every ContentBlock row and holds
    it for the whole transaction, so a patch cannot interleave -- it either
    lands entirely before the publish (and gets published) or waits and then
    fails its precondition. There is no window in which an edit is silently
    dropped.
    """

    reset_sequences = True

    def setUp(self):
        import_real_content()

    def test_a_patch_racing_a_publish_is_refused_rather_than_lost(self):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        stale_version = block.version
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "queued for publish"},
                    expected_version=stale_version)

        publish_has_the_lock = threading.Event()
        let_publish_finish = threading.Event()
        outcome: dict = {}

        real_assemble = publishing.assemble

        def stall(*args, **kwargs):
            # Called after every block row is locked and every draft promoted,
            # but before the transaction commits.
            publish_has_the_lock.set()
            let_publish_finish.wait(timeout=5)
            return real_assemble(*args, **kwargs)

        def do_publish():
            try:
                with mock.patch("content.services.publishing.assemble", stall):
                    publishing.publish()
                outcome["publish"] = "ok"
            except Exception as exc:
                outcome["publish"] = type(exc).__name__
            finally:
                connection.close()

        def do_patch():
            try:
                apply_patch(
                    namespace="hero", locale="en",
                    patch={"subtitle": "arrived mid-publish"},
                    expected_version=stale_version,
                )
                outcome["patch"] = "ok"
            except Exception as exc:
                outcome["patch"] = type(exc).__name__
            finally:
                connection.close()

        publisher = threading.Thread(target=do_publish)
        publisher.start()
        self.assertTrue(publish_has_the_lock.wait(timeout=5))

        editor = threading.Thread(target=do_patch)
        editor.start()
        # The editor is now blocked on the row lock the publisher holds.
        editor.join(timeout=0.4)
        self.assertTrue(editor.is_alive(), "the patch must block, not slip past the lock")

        let_publish_finish.set()
        publisher.join(timeout=5)
        editor.join(timeout=5)

        self.assertEqual(outcome.get("publish"), "ok")
        self.assertEqual(
            outcome.get("patch"), "ConcurrencyError",
            "the racing patch must be refused loudly, never silently dropped",
        )

        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.assertEqual(
            block.published_data["subtitle"], "queued for publish",
            "the draft that existed when publish started was published, not discarded",
        )
        self.assertIsNone(block.draft_data)

    def test_a_patch_on_an_untouched_block_survives_a_concurrent_publish(self):
        """Publish never bumps a block it did not promote, so this one still fits."""
        hero = ContentBlock.objects.get(namespace="hero", locale="en")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "hero only"},
                    expected_version=hero.version)

        clients_version = ContentBlock.objects.get(namespace="clients", locale="en").version

        publish_has_the_lock = threading.Event()
        let_publish_finish = threading.Event()
        outcome: dict = {}
        real_assemble = publishing.assemble

        def stall(*args, **kwargs):
            publish_has_the_lock.set()
            let_publish_finish.wait(timeout=5)
            return real_assemble(*args, **kwargs)

        def do_publish():
            try:
                with mock.patch("content.services.publishing.assemble", stall):
                    publishing.publish()
            finally:
                connection.close()

        def do_patch():
            try:
                apply_patch(namespace="clients", locale="en", patch={"tag": "unrelated"},
                            expected_version=clients_version)
                outcome["patch"] = "ok"
            except Exception as exc:
                outcome["patch"] = type(exc).__name__
            finally:
                connection.close()

        publisher = threading.Thread(target=do_publish)
        publisher.start()
        self.assertTrue(publish_has_the_lock.wait(timeout=5))

        editor = threading.Thread(target=do_patch)
        editor.start()
        let_publish_finish.set()
        publisher.join(timeout=5)
        editor.join(timeout=5)

        self.assertEqual(outcome.get("patch"), "ok")
        self.assertEqual(
            ContentBlock.objects.get(namespace="clients", locale="en").draft_data["tag"],
            "unrelated",
            "a draft created during someone else's publish is kept for the next one",
        )
