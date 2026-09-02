"""
Deliberate failures during publish and rollback.

Each test breaks the operation at a different point and then asserts that the
world looks exactly as it did before: same current revision, no half-promoted
drafts, no orphan revision row, history untouched.
"""

from unittest import mock

from django.test import TestCase

from content.models import ContentBlock, ContentVersion
from content.services import publishing
from content.services.patching import apply_patch

from .helpers import import_real_content


class Boom(Exception):
    """Injected failure."""


class PublishFailureTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def setUp(self):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.original_title = block.published_data["subtitle"]
        apply_patch(
            namespace="hero", locale="en", patch={"subtitle": "should never land"},
            expected_version=block.version,
        )
        self.revisions_before = ContentVersion.objects.count()
        self.current_before = publishing.current_version().number

    def assert_nothing_moved(self):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.assertEqual(block.published_data["subtitle"], self.original_title,
                         "published content must be untouched")
        self.assertIsNotNone(block.draft_data, "the draft must survive a failed publish")
        self.assertEqual(block.draft_data["subtitle"], "should never land")

        self.assertEqual(ContentVersion.objects.count(), self.revisions_before,
                         "no revision row may be left behind")
        current = ContentVersion.objects.filter(is_current=True)
        self.assertEqual(current.count(), 1, "exactly one current revision")
        self.assertEqual(current.get().number, self.current_before,
                         "the previous revision stays current")

    def test_failure_while_assembling_the_snapshot(self):
        with mock.patch("content.services.publishing.assemble", side_effect=Boom):
            with self.assertRaises(Boom):
                publishing.publish()
        self.assert_nothing_moved()

    def test_failure_while_appending_the_revision(self):
        with mock.patch("content.services.publishing._append_version", side_effect=Boom):
            with self.assertRaises(Boom):
                publishing.publish()
        self.assert_nothing_moved()

    def test_failure_after_the_old_current_flag_was_cleared(self):
        """The riskiest window: old revision demoted, new one not yet inserted."""
        real_create = ContentVersion.objects.create

        def explode(*args, **kwargs):
            raise Boom

        with mock.patch.object(ContentVersion.objects.__class__, "create", explode):
            with self.assertRaises(Boom):
                publishing.publish()
        self.assert_nothing_moved()
        self.assertIsNotNone(real_create)

    def test_failure_partway_through_promoting_drafts(self):
        """One namespace promoted, the next one explodes -- nothing may stick."""
        clients = ContentBlock.objects.get(namespace="clients", locale="en")
        clients_tag = clients.published_data["tag"]
        apply_patch(
            namespace="clients", locale="en", patch={"tag": "also never lands"},
            expected_version=clients.version,
        )

        original_save = ContentBlock.save
        calls = {"n": 0}

        def flaky(self, *args, **kwargs):
            calls["n"] += 1
            # Blocks are promoted in (namespace, locale) order, so "clients"
            # is written first and "hero" is the one that blows up.
            if calls["n"] > 1:
                raise Boom
            return original_save(self, *args, **kwargs)

        with mock.patch.object(ContentBlock, "save", flaky):
            with self.assertRaises(Boom):
                publishing.publish()

        self.assertGreater(calls["n"], 1, "the failure must land mid-promotion")
        self.assert_nothing_moved()

        clients = ContentBlock.objects.get(namespace="clients", locale="en")
        self.assertEqual(clients.published_data["tag"], clients_tag,
                         "the block promoted before the failure must be rolled back")
        self.assertIsNotNone(clients.draft_data)

    def test_locale_drift_refuses_to_publish_and_changes_nothing(self):
        """A real guard, not an injected one: drifted locales abort the publish."""
        from content.services.errors import ConcurrencyError

        arabic = ContentBlock.objects.get(namespace="hero", locale="ar")
        apply_patch(
            namespace="hero", locale="ar", patch={"brandNewKey": "only in arabic"},
            expected_version=arabic.version,
        )
        with self.assertRaises(ConcurrencyError):
            publishing.publish()
        self.assert_nothing_moved()


class RollbackFailureTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def setUp(self):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.first_title = block.published_data["subtitle"]
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "second"},
                    expected_version=block.version)
        self.v2 = publishing.publish(label="second")

        block = ContentBlock.objects.get(namespace="hero", locale="en")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": "third"},
                    expected_version=block.version)
        self.v3 = publishing.publish(label="third")

        self.revisions_before = ContentVersion.objects.count()

    def assert_nothing_moved(self):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.assertEqual(block.published_data["subtitle"], "third",
                         "the failed rollback must not have restored anything")
        self.assertEqual(ContentVersion.objects.count(), self.revisions_before)
        current = ContentVersion.objects.filter(is_current=True)
        self.assertEqual(current.count(), 1)
        self.assertEqual(current.get().number, self.v3.number)

    def test_failure_while_assembling(self):
        with mock.patch("content.services.publishing.assemble", side_effect=Boom):
            with self.assertRaises(Boom):
                publishing.rollback(target_number=self.v2.number)
        self.assert_nothing_moved()

    def test_failure_while_appending_the_revision(self):
        with mock.patch("content.services.publishing._append_version", side_effect=Boom):
            with self.assertRaises(Boom):
                publishing.rollback(target_number=self.v2.number)
        self.assert_nothing_moved()

    def test_failure_partway_through_restoring_blocks(self):
        original_save = ContentBlock.save
        calls = {"n": 0}

        def flaky(self, *args, **kwargs):
            calls["n"] += 1
            if calls["n"] > 3:
                raise Boom
            return original_save(self, *args, **kwargs)

        with mock.patch.object(ContentBlock, "save", flaky):
            with self.assertRaises(Boom):
                publishing.rollback(target_number=self.v2.number)
        self.assert_nothing_moved()

    def test_history_stays_intact_after_a_failed_rollback(self):
        with mock.patch("content.services.publishing.assemble", side_effect=Boom):
            with self.assertRaises(Boom):
                publishing.rollback(target_number=self.v2.number)

        self.v2.refresh_from_db()
        self.v3.refresh_from_db()
        self.assertEqual(self.v2.snapshot["en"]["hero"]["subtitle"], "second")
        self.assertEqual(self.v3.snapshot["en"]["hero"]["subtitle"], "third")
        self.assertEqual(self.v2.source, ContentVersion.Source.PUBLISH)
