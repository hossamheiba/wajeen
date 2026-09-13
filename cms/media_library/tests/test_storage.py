"""Where a file lands, and what it is called when it gets there."""

from __future__ import annotations

import shutil
import tempfile

from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings

from media_library.models import MediaAsset
from media_library.services import DuplicateAsset, store_image
from media_library.storage import checksum_of

from .helpers import image_bytes, upload

MEDIA = tempfile.mkdtemp(prefix="wjeen-media-test-")


@override_settings(MEDIA_ROOT=MEDIA)
class StorageTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA, ignore_errors=True)
        super().tearDownClass()

    def test_the_stored_name_is_the_content_hash_not_the_uploaded_one(self):
        """The bug this guards: Next caches optimised images by URL, so an
        image replaced in place under the same name serves the old bytes."""
        asset, created = store_image(upload("../../etc/passwd.jpg"))
        self.assertTrue(created)
        self.assertIn(asset.checksum, asset.file.name)
        self.assertNotIn("passwd", asset.file.name)
        self.assertNotIn("..", asset.file.name)
        self.assertTrue(asset.file.name.startswith("library/"))

    def test_the_original_name_is_kept_as_metadata(self):
        asset, _ = store_image(upload("Berri Gas Plant.jpg"))
        self.assertEqual(asset.original_name, "Berri Gas Plant.jpg")

    def test_the_extension_comes_from_the_bytes_not_the_name(self):
        """A PNG called `.jpg` is stored as a PNG."""
        asset, _ = store_image(
            upload("lying.jpg", image_format="PNG", content_type="image/jpeg")
        )
        self.assertTrue(asset.file.name.endswith(".png"))
        self.assertEqual(asset.content_type, "image/png")

    def test_dimensions_and_size_are_measured_not_trusted(self):
        asset, _ = store_image(upload(width=640, height=480))
        self.assertEqual((asset.width, asset.height), (640, 480))
        self.assertEqual(asset.bytes, len(image_bytes(640, 480)))

    def test_the_same_bytes_under_two_names_are_one_asset(self):
        first, created_first = store_image(upload("a.jpg"))
        second, created_second = store_image(upload("b.jpg"))
        self.assertTrue(created_first)
        self.assertFalse(created_second)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(MediaAsset.objects.count(), 1)

    def test_a_duplicate_can_be_refused_instead(self):
        store_image(upload("a.jpg"))
        with self.assertRaises(DuplicateAsset) as refused:
            store_image(upload("b.jpg"), on_duplicate="reject")
        self.assertEqual(refused.exception.existing.original_name, "a.jpg")

    def test_a_second_upload_fills_in_missing_alt_text_but_never_clears_it(self):
        store_image(upload("a.jpg"), alt_en="Berri Gas Plant")
        again, _ = store_image(upload("b.jpg"), alt_en="", alt_ar="محطة غاز بري")
        self.assertEqual(again.alt_en, "Berri Gas Plant")
        self.assertEqual(again.alt_ar, "محطة غاز بري")

    def test_two_different_images_are_two_assets(self):
        store_image(upload("a.jpg", colour=(10, 10, 10)))
        store_image(upload("b.jpg", colour=(200, 30, 30)))
        self.assertEqual(MediaAsset.objects.count(), 2)

    def test_identical_bytes_already_on_disk_are_reused_not_copied(self):
        """Two databases can share a MEDIA_ROOT — development and the e2e
        fixture do. Django's default collision handling would append a random
        suffix, leaving two identical files and two URLs for one image, which
        is exactly what content-addressing exists to prevent."""
        first, _ = store_image(upload("a.jpg"))
        stored = first.file.name
        MediaAsset.objects.all().delete()

        again, created = store_image(upload("b.jpg"))
        self.assertTrue(created)
        self.assertEqual(again.file.name, stored)
        self.assertNotIn("_", again.file.name.rsplit("/", 1)[-1].replace(".jpg", ""))

    def test_the_checksum_is_of_the_file_itself(self):
        handle = upload("a.jpg")
        expected = checksum_of(handle)
        asset, _ = store_image(handle)
        self.assertEqual(asset.checksum, expected)
        self.assertEqual(len(asset.checksum), 64)


@override_settings(MEDIA_ROOT=MEDIA)
class ValidationTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA, ignore_errors=True)
        super().tearDownClass()

    def refuses(self, handle, fragment: str):
        with self.assertRaises(ValidationError) as refused:
            store_image(handle)
        self.assertIn(fragment, " ".join(refused.exception.messages).lower())
        self.assertEqual(MediaAsset.objects.count(), 0)

    def test_a_file_that_is_not_an_image_is_refused(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.refuses(
            SimpleUploadedFile("payload.jpg", b"#!/bin/sh\nrm -rf /\n", content_type="image/jpeg"),
            "not an image",
        )

    def test_an_empty_file_is_refused(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.refuses(SimpleUploadedFile("empty.jpg", b"", content_type="image/jpeg"), "empty")

    def test_a_truncated_image_is_refused(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        whole = image_bytes(400, 300)
        self.refuses(
            SimpleUploadedFile("half.jpg", whole[: len(whole) // 2], content_type="image/jpeg"),
            "image",
        )

    @override_settings(WJEEN_MEDIA_MAX_BYTES=2048)
    def test_a_file_over_the_size_limit_is_refused(self):
        self.refuses(upload(width=800, height=800), "limit")

    @override_settings(WJEEN_MEDIA_MIN_EDGE=500)
    def test_an_image_below_the_smallest_edge_is_refused(self):
        self.refuses(upload(width=400, height=300), "smallest")

    @override_settings(WJEEN_MEDIA_MAX_EDGE=200)
    def test_an_image_over_the_longest_edge_is_refused(self):
        self.refuses(upload(width=400, height=300), "longest")

    @override_settings(WJEEN_MEDIA_MAX_PIXELS=1000)
    def test_a_decompression_bomb_is_refused_before_it_is_decoded(self):
        """Pillow raises DecompressionBombError from `open`, and it descends
        from Exception rather than OSError -- so catching the usual family of
        decode errors lets it straight through as a 500."""
        self.refuses(upload(width=400, height=300), "pixels")

    def test_a_gif_is_refused_because_the_site_does_not_serve_them(self):
        self.refuses(
            upload("animation.gif", image_format="GIF", content_type="image/gif"),
            "not accepted",
        )

    def test_png_webp_and_jpeg_are_all_accepted(self):
        for image_format, extension in (("JPEG", ".jpg"), ("PNG", ".png"), ("WEBP", ".webp")):
            asset, _ = store_image(
                upload(f"a.{extension}", image_format=image_format, colour=(1, 2, len(extension)))
            )
            self.assertTrue(asset.file.name.endswith(extension), image_format)
