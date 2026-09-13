"""CV validation and private storage.

Two questions: what may be stored, and can anything but the download view
reach it. Both are answered against the bytes and the filesystem, not against
what a request claimed.
"""

from __future__ import annotations

import shutil
import tempfile
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone

from inquiries.models import PrivateFile
from inquiries.services import store_cv

from .helpers import docx_bytes, pdf_bytes

PRIVATE = tempfile.mkdtemp(prefix="wjeen-cv-")


def upload(name: str, content: bytes, content_type: str = "application/pdf"):
    return SimpleUploadedFile(name, content, content_type=content_type)


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE)
class AcceptedTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def test_a_pdf_is_accepted(self):
        private = store_cv(upload("cv.pdf", pdf_bytes()))
        self.assertEqual(private.content_type, "application/pdf")
        self.assertTrue(private.file.name.endswith(".pdf"))

    def test_a_docx_is_accepted(self):
        private = store_cv(
            upload(
                "cv.docx",
                docx_bytes(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        )
        self.assertIn("wordprocessingml", private.content_type)
        self.assertTrue(private.file.name.endswith(".docx"))

    def test_the_stored_name_is_the_content_hash_not_the_uploaded_one(self):
        private = store_cv(upload("../../etc/passwd.pdf", pdf_bytes()))
        self.assertIn(private.checksum, private.file.name)
        self.assertNotIn("passwd", private.file.name)
        self.assertNotIn("..", private.file.name)
        self.assertTrue(private.file.name.startswith("cv/"))

    def test_the_original_name_is_kept_as_metadata(self):
        private = store_cv(upload("Ali Hassan CV.pdf", pdf_bytes()))
        self.assertEqual(private.original_name, "Ali Hassan CV.pdf")

    def test_the_extension_comes_from_the_bytes_not_the_name(self):
        """A .docx whose bytes are a PDF is stored as a PDF."""
        private = store_cv(upload("cv.docx", pdf_bytes()))
        self.assertTrue(private.file.name.endswith(".pdf"))

    def test_two_applicants_sending_the_same_document_are_two_files(self):
        """Deduplicating would make one person's CV vanish when the other's
        retention expired."""
        first = store_cv(upload("a.pdf", pdf_bytes()))
        second = store_cv(upload("b.pdf", pdf_bytes()))
        self.assertNotEqual(first.pk, second.pk)
        self.assertEqual(first.checksum, second.checksum)
        self.assertEqual(PrivateFile.objects.count(), 2)

    def test_the_retention_deadline_is_stamped_on_arrival(self):
        with override_settings(WJEEN_CV_RETENTION_DAYS=30):
            private = store_cv(upload("cv.pdf", pdf_bytes()))
        self.assertAlmostEqual(
            (private.expires_at - timezone.now()).days, 29, delta=1
        )


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE)
class RefusedTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def refuses(self, handle, fragment: str):
        with self.assertRaises(ValidationError) as refused:
            store_cv(handle)
        self.assertIn(fragment, " ".join(refused.exception.messages).lower())
        self.assertEqual(PrivateFile.objects.count(), 0)

    def test_a_jpeg_renamed_pdf_is_refused(self):
        """The name and the header both say PDF; the bytes do not."""
        self.refuses(upload("cv.pdf", b"\xff\xd8\xff\xe0" + b"0" * 400), "not a pdf")

    def test_a_text_file_is_refused(self):
        self.refuses(upload("cv.pdf", b"Dear sir, please find my CV below."), "not a pdf")

    def test_an_empty_file_is_refused(self):
        self.refuses(upload("cv.pdf", b""), "empty")

    def test_a_zip_that_is_not_a_word_document_is_refused(self):
        self.refuses(
            upload("cv.docx", docx_bytes(with_document=False), "application/zip"),
            "not a word document",
        )

    def test_a_damaged_archive_is_refused(self):
        self.refuses(upload("cv.docx", b"PK\x03\x04" + b"\x00" * 200), "archive")

    @override_settings(WJEEN_CV_MAX_BYTES=1024)
    def test_a_file_over_the_limit_is_refused(self):
        self.refuses(upload("cv.pdf", pdf_bytes(4000)), "limit")

    def test_an_executable_is_refused(self):
        self.refuses(upload("cv.pdf", b"\x7fELF" + b"\x00" * 200), "not a pdf")


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE)
class PrivacyTests(TestCase):
    """The storage must not be reachable any way but the download view."""

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def test_asking_for_a_url_is_a_programming_error(self):
        """A template or serializer that tried to expose one fails loudly here
        rather than quietly in production."""
        private = store_cv(upload("cv.pdf", pdf_bytes()))
        with self.assertRaises(ImproperlyConfigured):
            private.file.url  # noqa: B018

    def test_the_bytes_live_outside_media_root(self):
        from django.conf import settings

        private = store_cv(upload("cv.pdf", pdf_bytes()))
        stored = Path(private.file.path).resolve()
        media = Path(settings.MEDIA_ROOT).resolve()
        self.assertFalse(
            str(stored).startswith(str(media)),
            "a CV under MEDIA_ROOT would be served by the web server",
        )

    def test_no_url_pattern_serves_the_private_root(self):
        """`urlpatterns` adds a static route for MEDIA_URL in development. The
        private root must not get one, in any configuration."""
        from django.conf import settings
        from django.urls import get_resolver

        patterns = [str(entry.pattern) for entry in get_resolver().url_patterns]
        self.assertFalse(
            any("private" in pattern for pattern in patterns),
            f"a route mentions the private root: {patterns}",
        )
        self.assertNotIn(str(settings.WJEEN_PRIVATE_ROOT), " ".join(patterns))

    def test_a_cv_never_reaches_the_public_media_manifest(self):
        """The website's manifest is built from media_library bindings; a CV is
        not a MediaAsset and cannot appear in it."""
        from media_library.services import manifest

        store_cv(upload("cv.pdf", pdf_bytes()))
        self.assertEqual(manifest(), {})

    def test_a_cv_is_not_listed_in_the_media_library(self):
        from media_library.models import MediaAsset

        store_cv(upload("cv.pdf", pdf_bytes()))
        self.assertEqual(MediaAsset.objects.count(), 0)


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE)
class StorageSwapTests(TestCase):
    """Moving to private object storage must be a settings change."""

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def test_the_migration_records_no_storage_and_no_path(self):
        """If either were frozen into 0001_initial, changing where CVs live
        would need a migration."""
        from pathlib import Path as P

        from django.conf import settings as s

        source = (
            P(s.BASE_DIR) / "inquiries" / "migrations" / "0001_initial.py"
        ).read_text(encoding="utf-8")
        self.assertNotIn("privatefiles", source)
        self.assertNotIn("storage=", source)

    def test_the_field_follows_the_configured_root(self):
        other = tempfile.mkdtemp(prefix="wjeen-cv-elsewhere-")
        try:
            with override_settings(WJEEN_PRIVATE_ROOT=other):
                private = store_cv(upload("cv.pdf", pdf_bytes()))
                # Both sides resolved: on macOS /var is a symlink to
                # /private/var, so comparing a resolved path against a raw
                # temp path fails for a reason that has nothing to do with
                # storage.
                self.assertTrue(
                    Path(private.file.path).resolve().is_relative_to(
                        Path(other).resolve()
                    )
                )
        finally:
            shutil.rmtree(other, ignore_errors=True)
