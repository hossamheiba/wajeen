"""Placements: which image shows where, in what order, and what may be deleted."""

from __future__ import annotations

import shutil
import tempfile

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase, override_settings

from media_library.models import MediaAsset, MediaBinding
from media_library.services import manifest, set_gallery, set_single, store_image

from .helpers import upload

MEDIA = tempfile.mkdtemp(prefix="wjeen-bindings-test-")


@override_settings(MEDIA_ROOT=MEDIA)
class BindingTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA, ignore_errors=True)
        super().tearDownClass()

    def make(self, tag: int) -> MediaAsset:
        asset, _ = store_image(
            upload(f"photo-{tag}.jpg", colour=(tag, tag * 2 % 255, 90)),
            alt_en=f"Photo {tag}",
            alt_ar=f"صورة {tag}",
        )
        return asset

    # ---- the relation ----------------------------------------------------

    def test_a_cover_points_one_content_address_at_one_asset(self):
        asset = self.make(1)
        set_single("projectsPage", "items[3]", "cover", asset)

        binding = MediaBinding.objects.get()
        self.assertEqual(binding.address, "projectsPage.items[3]")
        self.assertEqual(binding.asset, asset)
        self.assertEqual(binding.position, 0)

    def test_setting_a_cover_twice_replaces_rather_than_accumulates(self):
        first, second = self.make(1), self.make(2)
        set_single("projectsPage", "items[3]", "cover", first)
        set_single("projectsPage", "items[3]", "cover", second)

        self.assertEqual(MediaBinding.objects.count(), 1)
        self.assertEqual(MediaBinding.objects.get().asset, second)

    def test_a_cover_can_be_cleared(self):
        set_single("projectsPage", "items[3]", "cover", self.make(1))
        set_single("projectsPage", "items[3]", "cover", None)
        self.assertEqual(MediaBinding.objects.count(), 0)

    def test_the_database_refuses_a_second_cover_at_one_address(self):
        """Not merely "the service replaces it" -- the constraint is real."""
        first, second = self.make(1), self.make(2)
        MediaBinding.objects.create(
            namespace="projectsPage", path="items[3]", role="cover", position=0, asset=first
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MediaBinding.objects.create(
                    namespace="projectsPage", path="items[3]", role="cover", position=1,
                    asset=second,
                )

    def test_one_asset_may_appear_at_several_addresses(self):
        asset = self.make(1)
        set_single("projectsPage", "items[3]", "cover", asset)
        set_single("gallery", "items[0]", "cover", asset)
        self.assertEqual(asset.usage_count, 2)

    def test_a_single_valued_role_rejects_a_non_zero_position(self):
        binding = MediaBinding(
            namespace="clients", path="items[0]", role="logo", position=2, asset=self.make(1)
        )
        with self.assertRaises(ValidationError):
            binding.full_clean()

    # ---- deletion protection --------------------------------------------

    def test_an_asset_in_use_cannot_be_deleted(self):
        asset = self.make(1)
        set_single("projectsPage", "items[3]", "cover", asset)
        with self.assertRaises(ProtectedError):
            asset.delete()
        self.assertTrue(MediaAsset.objects.filter(pk=asset.pk).exists())

    def test_an_unused_asset_can_be_deleted(self):
        asset = self.make(1)
        asset.delete()
        self.assertFalse(MediaAsset.objects.filter(pk=asset.pk).exists())

    def test_an_asset_becomes_deletable_once_nothing_shows_it(self):
        asset = self.make(1)
        set_single("projectsPage", "items[3]", "cover", asset)
        set_single("projectsPage", "items[3]", "cover", None)
        asset.delete()
        self.assertEqual(MediaAsset.objects.count(), 0)

    # ---- galleries -------------------------------------------------------

    def test_a_gallery_keeps_the_order_it_was_given(self):
        assets = [self.make(index) for index in range(1, 4)]
        set_gallery("projectsPage", "items[3]", [{"asset": asset} for asset in assets])

        stored = MediaBinding.objects.filter(role="gallery").order_by("position")
        self.assertEqual([binding.asset_id for binding in stored], [a.id for a in assets])
        self.assertEqual([binding.position for binding in stored], [0, 1, 2])

    def test_reordering_a_gallery_does_not_collide_on_position(self):
        """The bug this guards: replacing one item at a time trips the unique
        (address, role, position) index halfway through."""
        assets = [self.make(index) for index in range(1, 4)]
        set_gallery("projectsPage", "items[3]", [{"asset": asset} for asset in assets])

        reversed_order = list(reversed(assets))
        set_gallery("projectsPage", "items[3]", [{"asset": asset} for asset in reversed_order])

        stored = MediaBinding.objects.filter(role="gallery").order_by("position")
        self.assertEqual(
            [binding.asset_id for binding in stored], [a.id for a in reversed_order]
        )

    def test_emptying_a_gallery_leaves_the_assets_alone(self):
        assets = [self.make(index) for index in range(1, 3)]
        set_gallery("projectsPage", "items[3]", [{"asset": asset} for asset in assets])
        set_gallery("projectsPage", "items[3]", [])
        self.assertEqual(MediaBinding.objects.count(), 0)
        self.assertEqual(MediaAsset.objects.count(), 2)

    def test_a_gallery_and_a_cover_coexist_at_one_address(self):
        cover = self.make(9)
        gallery = [self.make(index) for index in range(1, 3)]
        set_single("projectsPage", "items[3]", "cover", cover)
        set_gallery("projectsPage", "items[3]", [{"asset": asset} for asset in gallery])
        self.assertEqual(MediaBinding.objects.count(), 3)

    # ---- the manifest ----------------------------------------------------

    def test_the_manifest_is_keyed_by_content_address(self):
        set_single("projectsPage", "items[3]", "cover", self.make(1))
        set_single("clients", "items[0]", "logo", self.make(2))

        tree = manifest()
        self.assertIn("projectsPage.items[3]", tree)
        self.assertIn("clients.items[0]", tree)
        self.assertIn("cover", tree["projectsPage.items[3]"])
        self.assertIn("logo", tree["clients.items[0]"])

    def test_the_manifest_carries_what_an_image_tag_needs(self):
        set_single("projectsPage", "items[3]", "cover", self.make(1))
        entry = manifest()["projectsPage.items[3]"]["cover"]
        self.assertTrue(entry["url"])
        self.assertEqual(entry["width"], 400)
        self.assertEqual(entry["height"], 300)
        self.assertEqual(entry["alt"], {"en": "Photo 1", "ar": "صورة 1"})

    def test_the_manifest_lists_a_gallery_in_order(self):
        assets = [self.make(index) for index in range(1, 4)]
        set_gallery("projectsPage", "items[3]", [{"asset": asset} for asset in assets])
        urls = [image["url"] for image in manifest()["projectsPage.items[3]"]["gallery"]]
        self.assertEqual(urls, [asset.file.url for asset in assets])

    def test_an_archived_asset_leaves_the_manifest(self):
        asset = self.make(1)
        set_single("projectsPage", "items[3]", "cover", asset)
        self.assertIn("projectsPage.items[3]", manifest())

        asset.status = MediaAsset.Status.ARCHIVED
        asset.save()
        self.assertNotIn("projectsPage.items[3]", manifest())

    def test_a_caption_reaches_the_manifest_only_when_it_was_written(self):
        set_gallery(
            "projectsPage", "items[3]", [{"asset": self.make(1), "caption_en": "West Pier"}]
        )
        entry = manifest()["projectsPage.items[3]"]["gallery"][0]
        self.assertEqual(entry["caption"], {"en": "West Pier", "ar": ""})

        set_gallery("projectsPage", "items[3]", [{"asset": self.make(2)}])
        plain = manifest()["projectsPage.items[3]"]["gallery"][0]
        self.assertNotIn("caption", plain)

    def test_the_manifest_is_empty_when_nothing_is_bound(self):
        self.make(1)
        self.assertEqual(manifest(), {})
