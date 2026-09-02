"""Optimistic concurrency per block, and the global publish lock."""

import threading

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
