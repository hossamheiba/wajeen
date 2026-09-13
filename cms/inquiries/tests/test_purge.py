"""Retention: the bytes go, the record stays.

An application still has to show that a CV was attached and when it was
removed, so purging clears the file and stamps the row rather than deleting
anything.
"""

from __future__ import annotations

import shutil
import tempfile
import uuid
from datetime import timedelta
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from inquiries.models import Inquiry, PrivateFile

from .helpers import pdf_bytes

PRIVATE = tempfile.mkdtemp(prefix="wjeen-purge-")


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE)
class PurgeTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def make(self, *, expired: bool) -> Inquiry:
        private = PrivateFile(
            checksum=uuid.uuid4().hex + uuid.uuid4().hex[:32],
            original_name="cv.pdf",
            content_type="application/pdf",
            bytes=200,
            expires_at=timezone.now() + timedelta(days=-1 if expired else 30),
        )
        private.file.save("cv.pdf", ContentFile(pdf_bytes()), save=False)
        private.save()
        return Inquiry.objects.create(
            kind=Inquiry.Kind.CAREER,
            name="Ali",
            email="ali@example.com",
            phone="+966500000000",
            send_to="",
            message="",
            aramco_vendor_id=None,
            cv=private,
            idempotency_key=uuid.uuid4(),
        )

    def test_an_expired_cv_loses_its_bytes_and_keeps_its_row(self):
        inquiry = self.make(expired=True)
        path = Path(inquiry.cv.file.path)
        self.assertTrue(path.exists())

        call_command("purge_expired_cvs", verbosity=0)

        inquiry.refresh_from_db()
        self.assertFalse(path.exists(), "the document should be gone")
        self.assertTrue(
            PrivateFile.objects.filter(pk=inquiry.cv_id).exists(),
            "the record that a CV existed should remain",
        )
        self.assertIsNotNone(inquiry.cv.purged_at)
        self.assertFalse(inquiry.cv.is_available)
        self.assertTrue(Inquiry.objects.filter(pk=inquiry.pk).exists())

    def test_a_cv_inside_its_retention_period_is_untouched(self):
        inquiry = self.make(expired=False)
        path = Path(inquiry.cv.file.path)

        call_command("purge_expired_cvs", verbosity=0)

        inquiry.refresh_from_db()
        self.assertTrue(path.exists())
        self.assertIsNone(inquiry.cv.purged_at)

    def test_a_dry_run_deletes_nothing(self):
        inquiry = self.make(expired=True)
        path = Path(inquiry.cv.file.path)

        call_command("purge_expired_cvs", "--dry-run", verbosity=0)

        inquiry.refresh_from_db()
        self.assertTrue(path.exists())
        self.assertIsNone(inquiry.cv.purged_at)

    def test_running_it_twice_is_harmless(self):
        self.make(expired=True)
        call_command("purge_expired_cvs", verbosity=0)
        call_command("purge_expired_cvs", verbosity=0)
        self.assertEqual(PrivateFile.objects.filter(purged_at__isnull=True).count(), 0)

    def test_the_retention_window_is_configurable(self):
        with override_settings(WJEEN_CV_RETENTION_DAYS=1):
            from inquiries.services import store_cv
            from django.core.files.uploadedfile import SimpleUploadedFile

            private = store_cv(
                SimpleUploadedFile("cv.pdf", pdf_bytes(), content_type="application/pdf")
            )
        self.assertLess((private.expires_at - timezone.now()).days, 2)
