"""Publish, rollback, snapshot completeness, and draft lifecycle."""

from django.test import TestCase

from content.models import ContentBlock, ContentVersion, ImmutableVersionError
from content.services import publishing
from content.services.errors import NothingToPublishError, UnknownVersionError
from content.services.paths import key_paths, structural_diff
from content.services.patching import apply_patch

from .helpers import import_real_content, load_repository_messages


class PublishTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def patch_hero(self, title="published title"):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        return apply_patch(
            namespace="hero", locale="en", patch={"subtitle": title},
            expected_version=block.version,
        )

    def test_publish_with_no_drafts_is_refused(self):
        with self.assertRaises(NothingToPublishError):
            publishing.publish()

    def test_publish_promotes_the_draft(self):
        self.patch_hero()
        publishing.publish()
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.assertEqual(block.published_data["subtitle"], "published title")

    def test_publish_clears_the_draft_so_it_cannot_be_published_twice(self):
        self.patch_hero()
        publishing.publish()
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.assertIsNone(block.draft_data)
        self.assertFalse(block.has_draft)
        with self.assertRaises(NothingToPublishError):
            publishing.publish()

    def test_publishing_one_namespace_still_snapshots_everything(self):
        """The headline invariant: a partial snapshot is never written."""
        self.patch_hero("only hero changed")
        version = publishing.publish()

        self.assertEqual(sorted(version.snapshot), ["ar", "en"])
        english = load_repository_messages("en")
        self.assertEqual(sorted(version.snapshot["en"]), sorted(english))
        self.assertEqual(sorted(version.snapshot["ar"]), sorted(english))
        self.assertEqual(len(list(key_paths(version.snapshot["en"]))), 962)
        self.assertEqual(len(list(key_paths(version.snapshot["ar"]))), 962)

    def test_unchanged_namespaces_carry_their_existing_published_data(self):
        self.patch_hero("changed")
        version = publishing.publish()
        original = load_repository_messages("en")
        for namespace, data in original.items():
            if namespace == "hero":
                continue
            self.assertEqual(version.snapshot["en"][namespace], data, namespace)
        self.assertEqual(version.snapshot["en"]["hero"]["subtitle"], "changed")

    def test_the_untouched_locale_is_included_in_full(self):
        self.patch_hero()
        version = publishing.publish()
        arabic = load_repository_messages("ar")
        self.assertEqual(structural_diff(arabic, version.snapshot["ar"]), [])

    def test_each_publish_appends_a_new_current_revision(self):
        self.patch_hero("one")
        first = publishing.publish()
        self.patch_hero("two")
        second = publishing.publish()

        self.assertEqual(first.number, 2)
        self.assertEqual(second.number, 3)
        self.assertEqual(ContentVersion.objects.filter(is_current=True).count(), 1)
        self.assertEqual(publishing.current_version().number, 3)

    def test_publish_records_its_source(self):
        self.patch_hero()
        self.assertEqual(publishing.publish().source, ContentVersion.Source.PUBLISH)


class RollbackTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def edit_and_publish(self, title):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        apply_patch(namespace="hero", locale="en", patch={"subtitle": title},
                    expected_version=block.version)
        return publishing.publish(label=title)

    def test_rollback_appends_a_revision_instead_of_mutating_history(self):
        first = self.edit_and_publish("v2 title")
        second = self.edit_and_publish("v3 title")

        restored = publishing.rollback(target_number=first.number)

        self.assertEqual(restored.number, 4)
        self.assertEqual(restored.source, ContentVersion.Source.ROLLBACK)
        self.assertEqual(restored.rolled_back_from_id, first.pk)
        self.assertEqual(ContentVersion.objects.count(), 4)

        second.refresh_from_db()
        self.assertEqual(second.snapshot["en"]["hero"]["subtitle"], "v3 title")
        self.assertFalse(second.is_current)

    def test_rollback_restores_the_published_content(self):
        first = self.edit_and_publish("v2 title")
        self.edit_and_publish("v3 title")
        publishing.rollback(target_number=first.number)
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.assertEqual(block.published_data["subtitle"], "v2 title")

    def test_the_rollback_snapshot_equals_the_target_snapshot(self):
        first = self.edit_and_publish("v2 title")
        self.edit_and_publish("v3 title")
        restored = publishing.rollback(target_number=first.number)
        self.assertEqual(structural_diff(first.snapshot, restored.snapshot), [])

    def test_a_rollback_can_itself_be_rolled_back(self):
        first = self.edit_and_publish("v2 title")
        third = self.edit_and_publish("v3 title")
        publishing.rollback(target_number=first.number)
        again = publishing.rollback(target_number=third.number)

        self.assertEqual(again.number, 5)
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.assertEqual(block.published_data["subtitle"], "v3 title")

    def test_rollback_leaves_pending_drafts_alone(self):
        first = self.edit_and_publish("v2 title")
        self.edit_and_publish("v3 title")

        clients = ContentBlock.objects.get(namespace="clients", locale="en")
        apply_patch(namespace="clients", locale="en", patch={"tag": "unpublished"},
                    expected_version=clients.version)

        publishing.rollback(target_number=first.number)

        clients = ContentBlock.objects.get(namespace="clients", locale="en")
        self.assertEqual(clients.draft_data["tag"], "unpublished")

    def test_rollback_to_an_unknown_revision_is_refused(self):
        with self.assertRaises(UnknownVersionError):
            publishing.rollback(target_number=999)


class ImmutabilityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def test_the_model_refuses_to_rewrite_a_snapshot(self):
        version = ContentVersion.objects.get(number=1)
        version.snapshot = {"en": {}, "ar": {}}
        with self.assertRaises(ImmutableVersionError):
            version.save()

    def test_the_model_refuses_deletion(self):
        with self.assertRaises(ImmutableVersionError):
            ContentVersion.objects.get(number=1).delete()

    def test_the_database_trigger_refuses_a_raw_update(self):
        """Even a queryset .update() that bypasses save() is rejected."""
        from django.db import transaction

        with self.assertRaises(Exception):
            with transaction.atomic():
                ContentVersion.objects.filter(number=1).update(label="rewritten")
        self.assertEqual(ContentVersion.objects.get(number=1).label,
                         "Imported from repository JSON")

    def test_the_database_trigger_refuses_a_raw_delete(self):
        from django.db import transaction

        with self.assertRaises(Exception):
            with transaction.atomic():
                ContentVersion.objects.filter(number=1).delete()
        self.assertTrue(ContentVersion.objects.filter(number=1).exists())

    def test_is_current_may_still_change(self):
        version = ContentVersion.objects.get(number=1)
        version.is_current = False
        version.save()
        self.assertFalse(ContentVersion.objects.get(number=1).is_current)
