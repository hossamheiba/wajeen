from django.core.management import call_command
from django.test import TestCase

from content.models import ContentBlock, ContentVersion
from content.services.paths import key_paths

from .helpers import import_real_content, load_repository_messages


class ImportMessagesTests(TestCase):
    def test_imports_every_namespace_in_both_locales(self):
        import_real_content()
        english = load_repository_messages("en")
        self.assertEqual(ContentBlock.objects.count(), len(english) * 2)
        self.assertEqual(ContentBlock.objects.filter(locale="en").count(), len(english))
        self.assertEqual(ContentBlock.objects.filter(locale="ar").count(), len(english))

    def test_block_data_matches_the_file_exactly(self):
        import_real_content()
        for locale in ("en", "ar"):
            original = load_repository_messages(locale)
            for namespace, data in original.items():
                block = ContentBlock.objects.get(namespace=namespace, locale=locale)
                self.assertEqual(block.published_data, data, namespace)
                self.assertIsNone(block.draft_data)

    def test_import_creates_a_single_baseline_revision(self):
        import_real_content()
        self.assertEqual(ContentVersion.objects.count(), 1)
        baseline = ContentVersion.objects.get()
        self.assertTrue(baseline.is_current)
        self.assertEqual(baseline.number, 1)
        self.assertEqual(sorted(baseline.snapshot), ["ar", "en"])

    def test_reimport_is_idempotent(self):
        import_real_content()
        before = ContentVersion.objects.count()
        call_command("import_messages", verbosity=0)
        self.assertEqual(ContentBlock.objects.count(), 56)
        self.assertEqual(ContentVersion.objects.count(), before)

    def test_republish_supersedes_a_stale_revision_instead_of_editing_it(self):
        """Re-importing changed content leaves history behind unless asked.

        The bug this guards: a re-import rewrites every published row, but the
        current revision still holds what it held before, so the revision log
        and the live site disagree. `--republish` appends a new revision --
        it never touches the old one, which the database refuses anyway.
        """
        import_real_content()
        stale = ContentVersion.objects.get(is_current=True)

        # Something changed underneath, the way a content edit to the
        # repository JSON would.
        block = ContentBlock.objects.get(namespace="nav", locale="en")
        block.published_data = {**block.published_data, "home": "Start"}
        block.save()

        call_command("import_messages", "--republish", verbosity=0)

        self.assertEqual(ContentVersion.objects.count(), 2)
        current = ContentVersion.objects.get(is_current=True)
        self.assertEqual(current.number, stale.number + 1)
        self.assertEqual(current.snapshot["en"]["nav"]["home"], "Home")

        stale.refresh_from_db()
        self.assertFalse(stale.is_current)
        self.assertEqual(stale.snapshot["en"]["nav"]["home"], "Home")

    def test_republish_does_nothing_when_the_import_changed_nothing(self):
        import_real_content()
        call_command("import_messages", "--republish", verbosity=0)
        self.assertEqual(ContentVersion.objects.count(), 1)

    def test_drop_drafts_clears_pending_edits(self):
        import_real_content()
        block = ContentBlock.objects.get(namespace="nav", locale="en")
        block.draft_data = {**block.published_data, "home": "Draft"}
        block.save()

        call_command("import_messages", verbosity=0)
        block.refresh_from_db()
        self.assertIsNotNone(block.draft_data, "a plain import leaves drafts alone")

        call_command("import_messages", "--drop-drafts", verbosity=0)
        block.refresh_from_db()
        self.assertIsNone(block.draft_data)

    def test_key_parity_is_enforced_across_locales(self):
        import_real_content()
        english = set(key_paths(load_repository_messages("en")))
        arabic = set(key_paths(load_repository_messages("ar")))
        self.assertEqual(english, arabic)
        self.assertEqual(len(english), 1223)

    def test_the_repository_files_are_never_written(self):
        from pathlib import Path

        from django.conf import settings

        paths = [Path(settings.MESSAGES_DIR) / f"{loc}.json" for loc in ("en", "ar")]
        before = [(p.stat().st_mtime_ns, p.stat().st_size) for p in paths]
        import_real_content()
        after = [(p.stat().st_mtime_ns, p.stat().st_size) for p in paths]
        self.assertEqual(before, after)
