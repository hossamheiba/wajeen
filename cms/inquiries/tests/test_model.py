"""The constraints, exercised against the database rather than the serializer.

Every rule here is enforced twice: readably in the serializer, and
structurally as a CHECK constraint. These tests bypass the serializer on
purpose -- a rule that only the API enforces is a rule a management command, a
shell or the next endpoint can break.
"""

from __future__ import annotations

import shutil
import tempfile
import uuid
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase, override_settings
from django.utils import timezone

from inquiries.models import CvAccessLog, Inquiry, PrivateFile

from .helpers import docx_bytes, pdf_bytes

PRIVATE = tempfile.mkdtemp(prefix="wjeen-inq-model-")


def a_file() -> PrivateFile:
    from django.core.files.base import ContentFile

    private = PrivateFile(
        checksum="a" * 64,
        original_name="cv.pdf",
        content_type="application/pdf",
        bytes=120,
        expires_at=timezone.now() + timedelta(days=365),
    )
    private.file.save("cv.pdf", ContentFile(pdf_bytes()), save=False)
    private.save()
    return private


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE)
class ConstraintTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def base(self, **over) -> dict:
        data = {
            "kind": Inquiry.Kind.CONTACT,
            "name": "Omar",
            "email": "omar@example.com",
            "phone": "+966500000000",
            "send_to": "ceo",
            "message": "Please send the company profile.",
            "idempotency_key": uuid.uuid4(),
        }
        data.update(over)
        return data

    def refused(self, **over):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Inquiry.objects.create(**self.base(**over))

    # ---- the Aramco rule -------------------------------------------------

    def test_aramco_off_must_not_carry_an_id(self):
        """The point of the rule: OFF means NULL, not "" and not a placeholder."""
        self.refused(
            kind=Inquiry.Kind.VENDOR,
            send_to="",
            company_name="Gulf Steel",
            city="jubail",
            service_type="material_supply",
            is_aramco_vendor=False,
            aramco_vendor_id="9999999",
        )

    def test_aramco_off_with_an_empty_string_is_also_refused(self):
        """"" is a stored value, and storing one would be a dummy value."""
        self.refused(
            kind=Inquiry.Kind.VENDOR,
            send_to="",
            company_name="Gulf Steel",
            city="jubail",
            service_type="material_supply",
            is_aramco_vendor=False,
            aramco_vendor_id="",
        )

    def test_aramco_on_requires_an_id(self):
        self.refused(
            kind=Inquiry.Kind.VENDOR,
            send_to="",
            company_name="Gulf Steel",
            city="jubail",
            service_type="material_supply",
            is_aramco_vendor=True,
            aramco_vendor_id=None,
        )

    def test_aramco_on_with_an_id_is_accepted(self):
        row = Inquiry.objects.create(
            **self.base(
                kind=Inquiry.Kind.VENDOR,
                send_to="",
                company_name="Gulf Steel",
                city="jubail",
                service_type="material_supply",
                is_aramco_vendor=True,
                aramco_vendor_id="1010101010",
            )
        )
        self.assertEqual(row.aramco_vendor_id, "1010101010")

    def test_aramco_off_with_null_is_accepted(self):
        row = Inquiry.objects.create(
            **self.base(
                kind=Inquiry.Kind.VENDOR,
                send_to="",
                company_name="Gulf Steel",
                city="jubail",
                service_type="material_supply",
                is_aramco_vendor=False,
                aramco_vendor_id=None,
            )
        )
        self.assertIsNone(row.aramco_vendor_id)

    # ---- the shape of each kind -----------------------------------------

    def test_a_vendor_needs_a_company_a_city_and_a_service(self):
        for missing in ("company_name", "city", "service_type"):
            fields = {
                "kind": Inquiry.Kind.VENDOR,
                "send_to": "",
                "company_name": "Gulf Steel",
                "city": "jubail",
                "service_type": "material_supply",
                "aramco_vendor_id": None,
            }
            fields[missing] = ""
            with self.subTest(missing=missing):
                self.refused(**fields)

    def test_a_contact_enquiry_needs_a_recipient(self):
        self.refused(send_to="", aramco_vendor_id=None)

    def test_a_career_application_needs_a_cv(self):
        self.refused(
            kind=Inquiry.Kind.CAREER, send_to="", message="", aramco_vendor_id=None, cv=None
        )

    def test_a_career_application_may_not_carry_a_message(self):
        """Four fields and no message -- enforced, not merely expected."""
        self.refused(
            kind=Inquiry.Kind.CAREER,
            send_to="",
            message="I would like to apply.",
            aramco_vendor_id=None,
            cv=a_file(),
        )

    def test_only_a_career_application_may_carry_a_cv(self):
        self.refused(aramco_vendor_id=None, cv=a_file())

    def test_a_career_application_with_a_cv_and_no_message_is_accepted(self):
        row = Inquiry.objects.create(
            **self.base(
                kind=Inquiry.Kind.CAREER,
                send_to="",
                message="",
                aramco_vendor_id=None,
                cv=a_file(),
            )
        )
        self.assertEqual(row.message, "")
        self.assertIsNotNone(row.cv)

    # ---- idempotency -----------------------------------------------------

    def test_the_idempotency_key_is_unique(self):
        key = uuid.uuid4()
        Inquiry.objects.create(**self.base(idempotency_key=key, aramco_vendor_id=None))
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Inquiry.objects.create(
                    **self.base(idempotency_key=key, aramco_vendor_id=None)
                )

    # ---- a CV in use -----------------------------------------------------

    def test_a_cv_in_use_cannot_be_deleted(self):
        private = a_file()
        Inquiry.objects.create(
            **self.base(
                kind=Inquiry.Kind.CAREER,
                send_to="",
                message="",
                aramco_vendor_id=None,
                cv=private,
            )
        )
        with self.assertRaises(ProtectedError):
            private.delete()


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE)
class StatusTimestampTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.row = Inquiry.objects.create(
            kind=Inquiry.Kind.CONTACT,
            name="Omar",
            email="omar@example.com",
            phone="+966500000000",
            send_to="ceo",
            message="Please send the company profile.",
            idempotency_key=uuid.uuid4(),
            aramco_vendor_id=None,
        )

    def test_reaching_read_stamps_read_at(self):
        self.assertIsNone(self.row.read_at)
        self.row.mark(Inquiry.Status.READ)
        self.assertIsNotNone(self.row.read_at)

    def test_reaching_replied_stamps_replied_at(self):
        self.row.mark(Inquiry.Status.REPLIED)
        self.assertIsNotNone(self.row.replied_at)

    def test_a_timestamp_is_never_moved_once_set(self):
        """It records when something first happened, not the last time."""
        self.row.mark(Inquiry.Status.READ)
        first = self.row.read_at
        self.row.mark(Inquiry.Status.ARCHIVED)
        self.row.mark(Inquiry.Status.READ)
        self.assertEqual(self.row.read_at, first)

    def test_a_timestamp_is_never_cleared(self):
        """Reopening a replied message keeps the date it was replied to."""
        self.row.mark(Inquiry.Status.REPLIED)
        replied = self.row.replied_at
        self.row.mark(Inquiry.Status.READ)
        self.row.refresh_from_db()
        self.assertEqual(self.row.replied_at, replied)
        self.assertEqual(self.row.status, Inquiry.Status.READ)

    def test_archiving_without_reading_leaves_read_at_empty(self):
        self.row.mark(Inquiry.Status.ARCHIVED)
        self.assertIsNone(self.row.read_at)
