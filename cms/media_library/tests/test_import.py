"""Moving the site's content-managed images into the library.

The command reads `public/images` and `src/messages/*.json` and writes rows.
It must never touch either — the files under /public are still the site's
fallback until the migration is verified, and the JSON is the content source.
"""

from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase, override_settings

from media_library.models import MediaAsset, MediaBinding

from .helpers import image_bytes

MEDIA = tempfile.mkdtemp(prefix="wjeen-import-test-")


def build_site(root: Path) -> tuple[Path, Path]:
    """A miniature of the real layout: two projects, one client, one gallery
    item, and one project photograph reused by the gallery."""
    images = root / "public" / "images"
    (images / "projects").mkdir(parents=True)
    (images / "clients").mkdir(parents=True)

    (images / "projects" / "berri.jpg").write_bytes(image_bytes(400, 300, (10, 20, 30)))
    (images / "projects" / "tanajib.jpg").write_bytes(image_bytes(400, 300, (40, 50, 60)))
    (images / "clients" / "aramco.jpg").write_bytes(image_bytes(200, 200, (70, 80, 90)))
    (images / "projects" / "orphan.jpg").write_bytes(image_bytes(320, 240, (99, 99, 99)))

    messages = root / "messages"
    messages.mkdir()
    content = {
        "en": {
            "projectsPage": {
                "items": [
                    {"title": "Berri Gas Plant", "image": "berri"},
                    {"title": "Tanajib", "image": "tanajib"},
                    {"title": "No photograph"},
                ]
            },
            "clients": {"items": [{"label": "Saudi Aramco", "logo": "aramco"}]},
            "gallery": {"items": [{"title": "Berri again", "image": "berri"}]},
        },
        "ar": {
            "projectsPage": {
                "items": [
                    {"title": "محطة غاز بري", "image": "berri"},
                    {"title": "تناجيب", "image": "tanajib"},
                    {"title": "بلا صورة"},
                ]
            },
            "clients": {"items": [{"label": "أرامكو السعودية", "logo": "aramco"}]},
            "gallery": {"items": [{"title": "بري مرة أخرى", "image": "berri"}]},
        },
    }
    for locale, tree in content.items():
        (messages / f"{locale}.json").write_text(json.dumps(tree), encoding="utf-8")
    return root / "public", messages


@override_settings(MEDIA_ROOT=MEDIA)
class ImportMediaTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="wjeen-site-"))
        self.public, self.messages = build_site(self.root)
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)

    def run_import(self, *args):
        with self.settings(MESSAGES_DIR=self.messages, CONTENT_LOCALES=["en", "ar"]):
            call_command("import_media", "--public", str(self.public), *args, verbosity=0)

    def test_it_binds_every_image_the_content_names(self):
        self.run_import()
        self.assertEqual(MediaBinding.objects.count(), 4)
        self.assertEqual(
            sorted(binding.address for binding in MediaBinding.objects.all()),
            [
                "clients.items[0]",
                "gallery.items[0]",
                "projectsPage.items[0]",
                "projectsPage.items[1]",
            ],
        )

    def test_a_client_logo_is_bound_as_a_logo_and_a_project_as_a_cover(self):
        self.run_import()
        self.assertEqual(
            MediaBinding.objects.get(namespace="clients").role, MediaBinding.Role.LOGO
        )
        self.assertEqual(
            MediaBinding.objects.get(namespace="projectsPage", path="items[0]").role,
            MediaBinding.Role.COVER,
        )

    def test_an_item_with_no_image_gets_no_binding(self):
        self.run_import()
        self.assertFalse(
            MediaBinding.objects.filter(namespace="projectsPage", path="items[2]").exists()
        )

    def test_one_file_used_twice_is_one_asset_with_two_bindings(self):
        self.run_import()
        berri = MediaAsset.objects.get(original_name="berri.jpg")
        self.assertEqual(berri.usage_count, 2)
        self.assertEqual(MediaAsset.objects.count(), 3)

    def test_alt_text_comes_from_the_content_in_both_languages(self):
        self.run_import()
        berri = MediaAsset.objects.get(original_name="berri.jpg")
        self.assertEqual(berri.alt_en, "Berri Gas Plant")
        self.assertEqual(berri.alt_ar, "محطة غاز بري")

        aramco = MediaAsset.objects.get(original_name="aramco.jpg")
        self.assertEqual(aramco.alt_en, "Saudi Aramco")
        self.assertEqual(aramco.alt_ar, "أرامكو السعودية")

    def test_categories_follow_where_the_image_is_used(self):
        self.run_import()
        self.assertEqual(
            MediaAsset.objects.get(original_name="aramco.jpg").category,
            MediaAsset.Category.CLIENT,
        )
        self.assertEqual(
            MediaAsset.objects.get(original_name="tanajib.jpg").category,
            MediaAsset.Category.PROJECT,
        )

    def test_an_unreferenced_file_is_left_out_unless_asked_for(self):
        self.run_import()
        self.assertFalse(MediaAsset.objects.filter(original_name="orphan.jpg").exists())

        self.run_import("--unbound")
        orphan = MediaAsset.objects.get(original_name="orphan.jpg")
        self.assertEqual(orphan.usage_count, 0, "an unbound import shows nothing new")

    def test_a_dry_run_writes_nothing(self):
        self.run_import("--dry-run")
        self.assertEqual(MediaAsset.objects.count(), 0)
        self.assertEqual(MediaBinding.objects.count(), 0)

    def test_running_it_twice_does_not_duplicate_anything(self):
        self.run_import()
        self.run_import()
        self.assertEqual(MediaAsset.objects.count(), 3)
        self.assertEqual(MediaBinding.objects.count(), 4)

    def test_the_files_under_public_are_only_read(self):
        before = {
            path: path.read_bytes()
            for path in sorted((self.public / "images").rglob("*.jpg"))
        }
        self.run_import("--unbound")
        after = {
            path: path.read_bytes()
            for path in sorted((self.public / "images").rglob("*.jpg"))
        }
        self.assertEqual(before, after)

    def test_the_content_json_is_only_read(self):
        before = {
            path: path.read_text(encoding="utf-8")
            for path in sorted(self.messages.glob("*.json"))
        }
        self.run_import()
        after = {
            path: path.read_text(encoding="utf-8")
            for path in sorted(self.messages.glob("*.json"))
        }
        self.assertEqual(before, after)

    def test_a_missing_file_is_reported_rather_than_guessed_at(self):
        (self.public / "images" / "projects" / "berri.jpg").unlink()
        self.run_import()
        self.assertFalse(
            MediaBinding.objects.filter(namespace="projectsPage", path="items[0]").exists()
        )
        # And the rest still imported: one bad row does not abandon the job.
        self.assertTrue(
            MediaBinding.objects.filter(namespace="projectsPage", path="items[1]").exists()
        )
