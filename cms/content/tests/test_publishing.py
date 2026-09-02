"""Publish, rollback, snapshot completeness, and draft lifecycle."""

from django.test import TestCase

from content.models import ContentBlock, ContentVersion, ImmutableVersionError
from content.services import publishing
from content.services.errors import (
    ConcurrencyError,
    NothingToPublishError,
    UnknownVersionError,
)
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


class DraftLifecycleTests(TestCase):
    """What publish and rollback do to draft_data -- stated explicitly.

    Publish touches *only* blocks that had a draft. Rollback touches
    published_data on every block in the snapshot and never reads or writes
    draft_data at all.
    """

    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def draft(self, namespace, locale="en", **patch):
        block = ContentBlock.objects.get(namespace=namespace, locale=locale)
        return apply_patch(
            namespace=namespace, locale=locale, patch=patch,
            expected_version=block.version,
        )

    # -- publish ---------------------------------------------------------

    def test_publish_clears_every_promoted_draft(self):
        self.draft("hero", subtitle="a")
        self.draft("hero", locale="ar", subtitle="ب")
        self.draft("clients", tag="c")
        self.assertEqual(ContentBlock.objects.filter(draft_data__isnull=False).count(), 3)

        publishing.publish()

        self.assertEqual(
            ContentBlock.objects.filter(draft_data__isnull=False).count(),
            0,
            "no draft may survive a successful publish",
        )

    def test_publish_leaves_blocks_without_a_draft_completely_untouched(self):
        untouched = ContentBlock.objects.get(namespace="clients", locale="en")
        before = (untouched.version, untouched.updated_at, untouched.published_data)

        self.draft("hero", subtitle="only hero has a draft")
        publishing.publish()

        untouched.refresh_from_db()
        self.assertEqual(untouched.version, before[0], "version must not move")
        self.assertEqual(untouched.updated_at, before[1], "the row must not be rewritten")
        self.assertEqual(untouched.published_data, before[2])
        self.assertIsNone(untouched.draft_data)

    def test_someone_elses_publish_does_not_invalidate_an_unrelated_editor(self):
        """A consequence of the above: no spurious 412 for a bystander."""
        bystander = ContentBlock.objects.get(namespace="clients", locale="en").version

        self.draft("hero", subtitle="unrelated change")
        publishing.publish()

        block = apply_patch(
            namespace="clients", locale="en", patch={"tag": "still valid"},
            expected_version=bystander,
        )
        self.assertEqual(block.draft_data["tag"], "still valid")

    # -- rollback --------------------------------------------------------

    def test_rollback_never_clears_a_draft(self):
        self.draft("hero", subtitle="published")
        first = publishing.publish()
        self.draft("hero", subtitle="published again")
        publishing.publish()

        self.draft("clients", tag="pending work")
        self.draft("hero", subtitle="pending too")
        pending = ContentBlock.objects.filter(draft_data__isnull=False).count()
        self.assertEqual(pending, 2)

        publishing.rollback(target_number=first.number)

        self.assertEqual(
            ContentBlock.objects.filter(draft_data__isnull=False).count(),
            pending,
            "unpublished work survives a rollback of the published site",
        )
        self.assertEqual(
            ContentBlock.objects.get(namespace="clients", locale="en").draft_data["tag"],
            "pending work",
        )

    def test_rollback_bumps_every_block_version_so_open_editors_must_refetch(self):
        self.draft("hero", subtitle="v2")
        first = publishing.publish()
        self.draft("hero", subtitle="v3")
        publishing.publish()

        block = ContentBlock.objects.get(namespace="clients", locale="en")
        apply_patch(namespace="clients", locale="en", patch={"tag": "open editor"},
                    expected_version=block.version)
        stale = ContentBlock.objects.get(namespace="clients", locale="en").version

        publishing.rollback(target_number=first.number)

        self.assertGreater(ContentBlock.objects.get(namespace="clients", locale="en").version, stale)
        with self.assertRaises(ConcurrencyError):
            apply_patch(namespace="clients", locale="en", patch={"tag": "x"},
                        expected_version=stale)
        self.assertEqual(
            ContentBlock.objects.get(namespace="clients", locale="en").draft_data["tag"],
            "open editor",
            "the draft itself is untouched -- only its precondition went stale",
        )

    def test_a_draft_older_than_a_rollback_republishes_its_own_era(self):
        """The sharp edge of keeping drafts: a draft is a whole namespace.

        A draft opened before a rollback still carries the fields as they were
        when it was seeded, so publishing it re-applies that era's content --
        including fields the rollback had just reverted. Not a bug: the draft
        is an explicit statement of what to publish. Worth pinning, because the
        publishing UI (out of scope here) will need to warn about it.
        """
        original = ContentBlock.objects.get(namespace="hero", locale="en").published_data
        baseline_cta = original["ctaPrimary"]

        self.draft("hero", ctaPrimary="era-two cta")
        publishing.publish(label="era two")

        # Seeded from era two, so it carries era two's ctaPrimary as well.
        self.draft("hero", subtitle="era-two subtitle")

        publishing.rollback(target_number=1)
        reverted = ContentBlock.objects.get(namespace="hero", locale="en")
        self.assertEqual(reverted.published_data["ctaPrimary"], baseline_cta)
        self.assertEqual(reverted.draft_data["ctaPrimary"], "era-two cta")

        publishing.publish(label="publishing the stale draft")

        block = ContentBlock.objects.get(namespace="hero", locale="en")
        self.assertEqual(block.published_data["subtitle"], "era-two subtitle")
        self.assertEqual(
            block.published_data["ctaPrimary"],
            "era-two cta",
            "publishing a pre-rollback draft re-applies that era's fields",
        )
        self.assertIsNone(block.draft_data)
