"""The endpoints, over real HTTP.

The submission endpoint is exercised the way the website calls it -- with the
shared secret, with a forwarded address, and with multipart when there is a
CV. The dashboard endpoints are exercised with the real cookie and CSRF
policy.
"""

from __future__ import annotations

import shutil
import tempfile
import uuid

from django.contrib.auth.models import Permission
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from content.tests.helpers import csrf_token, login, make_editor
from inquiries.models import CvAccessLog, Inquiry

from .helpers import (
    career_payload,
    contact_payload,
    docx_bytes,
    pdf_bytes,
    upload,
    vendor_payload,
)

PRIVATE = tempfile.mkdtemp(prefix="wjeen-inq-api-")
TOKEN = "test-inquiry-token"


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE, WJEEN_INQUIRY_TOKEN=TOKEN)
class SubmitTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()

    def post(self, data, *, token=TOKEN, fmt="json", ip="203.0.113.9"):
        headers = {"HTTP_X_FORWARDED_FOR": ip}
        if token is not None:
            headers["HTTP_X_WJEEN_INQUIRY_TOKEN"] = token
        return self.client.post("/api/v1/inquiries/", data, format=fmt, **headers)

    # ---- the secret ------------------------------------------------------

    def test_a_submission_without_the_secret_is_refused(self):
        response = self.post(contact_payload(), token=None)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Inquiry.objects.count(), 0)

    def test_a_wrong_secret_is_refused(self):
        response = self.post(contact_payload(), token="nope")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Inquiry.objects.count(), 0)

    @override_settings(WJEEN_INQUIRY_TOKEN="")
    def test_an_unset_secret_closes_the_endpoint(self):
        """A missing setting must not mean "accept anything"."""
        response = self.post(contact_payload(), token="")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(Inquiry.objects.count(), 0)

    # ---- each kind -------------------------------------------------------

    def test_a_contact_enquiry_is_stored(self):
        response = self.post(contact_payload())
        self.assertEqual(response.status_code, 201)

        row = Inquiry.objects.get()
        self.assertEqual(row.kind, "contact")
        self.assertEqual(row.send_to, "ceo")
        self.assertEqual(row.company_name, "")
        self.assertIsNone(row.aramco_vendor_id)
        self.assertIsNone(row.cv)
        self.assertFalse(row.notified, "nothing has been emailed yet")

    def test_a_vendor_enquiry_is_stored_with_every_field(self):
        response = self.post(vendor_payload())
        self.assertEqual(response.status_code, 201)

        row = Inquiry.objects.get()
        self.assertEqual(row.company_name, "Gulf Steel Co.")
        self.assertEqual(row.city, "jubail")
        self.assertEqual(row.service_type, "material_supply")
        self.assertEqual(row.name, "Sara", "the contact person is the person's name")
        self.assertEqual(row.send_to, "")

    def test_a_career_application_is_stored_with_its_cv(self):
        response = self.post(
            career_payload(cv=upload("cv.pdf", pdf_bytes())), fmt="multipart"
        )
        self.assertEqual(response.status_code, 201)

        row = Inquiry.objects.get()
        self.assertIsNotNone(row.cv)
        self.assertEqual(row.message, "", "a career application collects no message")

    # ---- the Aramco rule through the API --------------------------------

    def test_an_id_sent_with_the_box_off_is_dropped(self):
        """Not stored as "", not stored as the value -- dropped to NULL."""
        response = self.post(
            vendor_payload(is_aramco_vendor=False, aramco_vendor_id="9999999")
        )
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(Inquiry.objects.get().aramco_vendor_id)

    def test_the_box_on_without_an_id_is_rejected_on_that_field(self):
        response = self.post(vendor_payload(is_aramco_vendor=True))
        self.assertEqual(response.status_code, 400)
        self.assertIn("aramco_vendor_id", response.json()["errors"])

    def test_the_box_on_with_an_id_is_stored(self):
        response = self.post(
            vendor_payload(is_aramco_vendor=True, aramco_vendor_id="1010101010")
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Inquiry.objects.get().aramco_vendor_id, "1010101010")

    # ---- required fields -------------------------------------------------

    def test_a_phone_number_is_required_for_every_kind(self):
        for payload in (contact_payload, vendor_payload, career_payload):
            with self.subTest(kind=payload()["kind"]):
                data = payload(phone="")
                if data["kind"] == "career":
                    data["cv"] = upload("cv.pdf", pdf_bytes())
                    response = self.post(data, fmt="multipart")
                else:
                    response = self.post(data)
                self.assertEqual(response.status_code, 400)
                self.assertIn("phone", response.json()["errors"])

    def test_a_contact_enquiry_without_a_recipient_is_rejected(self):
        response = self.post(contact_payload(send_to=""))
        self.assertEqual(response.status_code, 400)
        self.assertIn("send_to", response.json()["errors"])

    def test_a_vendor_without_a_city_is_rejected(self):
        response = self.post(vendor_payload(city=""))
        self.assertEqual(response.status_code, 400)
        self.assertIn("city", response.json()["errors"])

    def test_a_career_application_without_a_cv_is_rejected(self):
        response = self.post(career_payload())
        self.assertEqual(response.status_code, 400)
        self.assertIn("cv", response.json()["errors"])

    def test_an_unknown_code_is_rejected(self):
        for field, value in (
            ("send_to", "chief_wizard"),
            ("city", "atlantis"),
        ):
            with self.subTest(field=field):
                payload = contact_payload() if field == "send_to" else vendor_payload()
                payload[field] = value
                response = self.post(payload)
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json()["errors"])

    # ---- idempotency -----------------------------------------------------

    def test_the_same_key_with_the_same_payload_is_one_inquiry(self):
        payload = contact_payload()
        first = self.post(payload)
        second = self.post(payload)

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertFalse(second.json()["created"])
        self.assertEqual(Inquiry.objects.count(), 1)

    def test_the_same_key_with_different_content_is_refused(self):
        payload = contact_payload()
        self.post(payload)
        response = self.post({**payload, "message": "Something else entirely."})

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "idempotency_conflict")
        self.assertEqual(Inquiry.objects.count(), 1)

    def test_a_replay_of_a_career_application_compares_the_cv_too(self):
        payload = career_payload()
        first = self.post(
            {**payload, "cv": upload("cv.pdf", pdf_bytes())}, fmt="multipart"
        )
        self.assertEqual(first.status_code, 201)

        # The same document under a different name is the same submission.
        again = self.post(
            {**payload, "cv": upload("renamed.pdf", pdf_bytes())}, fmt="multipart"
        )
        self.assertEqual(again.status_code, 200)
        self.assertEqual(Inquiry.objects.count(), 1)

        # A different document is not.
        different = self.post(
            {**payload, "cv": upload("cv.docx", docx_bytes())}, fmt="multipart"
        )
        self.assertEqual(different.status_code, 409)

    def test_two_different_keys_are_two_inquiries(self):
        self.post(contact_payload())
        self.post(contact_payload())
        self.assertEqual(Inquiry.objects.count(), 2)

    # ---- the address -----------------------------------------------------

    def test_the_client_address_is_stored_hashed(self):
        self.post(contact_payload(), ip="203.0.113.9")
        row = Inquiry.objects.get()
        self.assertNotIn("203.0.113.9", row.source_ip_hash)
        self.assertEqual(len(row.source_ip_hash), 64)

    def test_submissions_from_one_address_are_rate_limited(self):
        from inquiries.throttle import LIMIT

        for _ in range(LIMIT):
            self.assertEqual(self.post(contact_payload()).status_code, 201)

        blocked = self.post(contact_payload())
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("Retry-After", blocked)
        self.assertEqual(Inquiry.objects.count(), LIMIT)

    def test_a_different_address_is_not_affected(self):
        from inquiries.throttle import LIMIT

        for _ in range(LIMIT):
            self.post(contact_payload(), ip="203.0.113.9")
        self.assertEqual(
            self.post(contact_payload(), ip="198.51.100.4").status_code, 201
        )


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE, WJEEN_INQUIRY_TOKEN=TOKEN)
class NotificationReportTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.client.post(
            "/api/v1/inquiries/",
            contact_payload(),
            format="json",
            HTTP_X_WJEEN_INQUIRY_TOKEN=TOKEN,
        )
        self.row = Inquiry.objects.get()

    def report(self, error: str, *, token=TOKEN):
        headers = {"HTTP_X_WJEEN_INQUIRY_TOKEN": token} if token else {}
        return self.client.patch(
            f"/api/v1/inquiries/{self.row.id}/notified/",
            {"error": error},
            format="json",
            **headers,
        )

    def test_a_success_marks_the_row_notified(self):
        self.assertEqual(self.report("").status_code, 200)
        self.row.refresh_from_db()
        self.assertTrue(self.row.notified)
        self.assertEqual(self.row.notify_error, "")

    def test_a_failure_is_recorded_as_state_not_lost(self):
        """This is the case the old flow hid: the visitor was thanked and the
        failure went to a log nobody reads."""
        self.assertEqual(self.report("Email delivery failed: no key").status_code, 200)
        self.row.refresh_from_db()
        self.assertFalse(self.row.notified)
        self.assertIn("no key", self.row.notify_error)
        self.assertEqual(self.row.notify_attempts, 1)

    def test_attempts_accumulate(self):
        self.report("first")
        self.report("second")
        self.row.refresh_from_db()
        self.assertEqual(self.row.notify_attempts, 2)

    def test_reporting_needs_the_secret(self):
        self.assertEqual(self.report("", token=None).status_code, 403)

    def test_the_pending_list_offers_what_still_needs_sending(self):
        self.report("nope")
        response = self.client.get(
            "/api/v1/inquiries/pending-notification/",
            HTTP_X_WJEEN_INQUIRY_TOKEN=TOKEN,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.json()["results"]], [self.row.id])

    def test_a_row_past_the_attempt_ceiling_is_left_alone(self):
        with override_settings(WJEEN_NOTIFY_MAX_ATTEMPTS=2):
            self.report("one")
            self.report("two")
            response = self.client.get(
                "/api/v1/inquiries/pending-notification/",
                HTTP_X_WJEEN_INQUIRY_TOKEN=TOKEN,
            )
        self.assertEqual(response.json()["results"], [])

    def test_a_notified_row_is_not_in_the_pending_list(self):
        self.report("")
        response = self.client.get(
            "/api/v1/inquiries/pending-notification/",
            HTTP_X_WJEEN_INQUIRY_TOKEN=TOKEN,
        )
        self.assertEqual(response.json()["results"], [])

    def test_the_pending_list_needs_the_secret(self):
        response = self.client.get("/api/v1/inquiries/pending-notification/")
        self.assertEqual(response.status_code, 403)


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE, WJEEN_INQUIRY_TOKEN=TOKEN)
class DashboardTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        for payload, fmt in (
            (contact_payload(), "json"),
            (vendor_payload(), "json"),
            (career_payload(cv=upload("cv.pdf", pdf_bytes())), "multipart"),
        ):
            self.client.post(
                "/api/v1/inquiries/",
                payload,
                format=fmt,
                HTTP_X_WJEEN_INQUIRY_TOKEN=TOKEN,
            )
        self.editor = make_editor()
        login(self.client)
        self.token = csrf_token(self.client)

    def test_the_inbox_is_closed_to_anonymous_callers(self):
        anonymous = APIClient()
        for path in ("/api/v1/admin/inquiries/", "/api/v1/admin/inquiries/1/"):
            self.assertIn(anonymous.get(path).status_code, (401, 403), path)

    def test_it_lists_every_submission_with_counts(self):
        body = self.client.get("/api/v1/admin/inquiries/").json()
        self.assertEqual(body["total"], 3)
        self.assertEqual(body["counts"]["new"], 3)
        self.assertEqual(body["counts"]["contact"], 1)
        self.assertEqual(body["counts"]["vendor"], 1)
        self.assertEqual(body["counts"]["career"], 1)
        self.assertEqual(body["counts"]["unnotified"], 3)

    def test_it_filters_by_kind_and_by_status(self):
        rows = self.client.get("/api/v1/admin/inquiries/?kind=vendor").json()["results"]
        self.assertEqual([row["kind"] for row in rows], ["vendor"])

        rows = self.client.get("/api/v1/admin/inquiries/?status=archived").json()["results"]
        self.assertEqual(rows, [])

    def test_it_searches_name_email_and_company(self):
        for term, expected in (("Sara", 1), ("gulfsteel", 1), ("Gulf Steel", 1), ("zzz", 0)):
            with self.subTest(term=term):
                body = self.client.get(f"/api/v1/admin/inquiries/?search={term}").json()
                self.assertEqual(len(body["results"]), expected)

    def test_a_cv_is_described_but_never_linked(self):
        row = self.client.get("/api/v1/admin/inquiries/?kind=career").json()["results"][0]
        self.assertIsNotNone(row["cv"])
        self.assertNotIn("url", row["cv"])
        self.assertNotIn("file", row["cv"])
        self.assertTrue(row["cv"]["available"])

    def test_the_status_moves_and_stamps(self):
        row = Inquiry.objects.filter(kind="contact").get()
        response = self.client.patch(
            f"/api/v1/admin/inquiries/{row.id}/",
            {"status": "read"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json()["read_at"])
        self.assertEqual(response.json()["handled_by"], self.editor.username)

    def test_nothing_a_visitor_typed_can_be_edited(self):
        row = Inquiry.objects.filter(kind="contact").get()
        self.client.patch(
            f"/api/v1/admin/inquiries/{row.id}/",
            {"status": "read", "name": "Tampered", "email": "x@x.com"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        row.refresh_from_db()
        self.assertEqual(row.name, "Omar")

    def test_an_unknown_status_is_rejected(self):
        row = Inquiry.objects.filter(kind="contact").get()
        response = self.client.patch(
            f"/api/v1/admin/inquiries/{row.id}/",
            {"status": "deleted"},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(response.status_code, 400)

    def test_there_is_no_way_to_delete_an_inquiry(self):
        """Archived, never erased -- so the route does not exist."""
        row = Inquiry.objects.first()
        response = self.client.delete(
            f"/api/v1/admin/inquiries/{row.id}/", HTTP_X_CSRFTOKEN=self.token
        )
        self.assertIn(response.status_code, (403, 405))
        self.assertTrue(Inquiry.objects.filter(pk=row.pk).exists())

    def test_requeueing_clears_the_notification_flags(self):
        row = Inquiry.objects.first()
        row.notified = True
        row.notify_attempts = 4
        row.save(update_fields=["notified", "notify_attempts"])

        response = self.client.post(
            f"/api/v1/admin/inquiries/{row.id}/notify/",
            {},
            format="json",
            HTTP_X_CSRFTOKEN=self.token,
        )
        self.assertEqual(response.status_code, 200)
        row.refresh_from_db()
        self.assertFalse(row.notified)
        self.assertEqual(row.notify_attempts, 0)


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE, WJEEN_INQUIRY_TOKEN=TOKEN)
class CvAccessTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        self.client.post(
            "/api/v1/inquiries/",
            career_payload(cv=upload("cv.pdf", pdf_bytes())),
            format="multipart",
            HTTP_X_WJEEN_INQUIRY_TOKEN=TOKEN,
        )
        self.row = Inquiry.objects.get()
        self.editor = make_editor()
        login(self.client)

    def url(self):
        return f"/api/v1/admin/inquiries/{self.row.id}/cv/"

    def grant(self):
        self.editor.user_permissions.add(
            Permission.objects.get(codename="view_cv", content_type__app_label="inquiries")
        )
        # Django caches permissions per instance for the life of a request.
        self.editor = type(self.editor).objects.get(pk=self.editor.pk)
        login(self.client)

    def test_an_anonymous_caller_gets_nothing(self):
        self.assertIn(APIClient().get(self.url()).status_code, (401, 403))

    def test_staff_without_the_permission_is_refused(self):
        """Triaging the inbox and opening a CV are separate grants."""
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "cv_permission_required")

    def test_staff_with_the_permission_gets_the_file(self):
        self.grant()
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertIn("no-store", response["Cache-Control"])

    def test_the_filename_offered_is_generated_not_the_applicants(self):
        self.grant()
        response = self.client.get(self.url())
        self.assertIn(f"cv-{self.row.id}.pdf", response["Content-Disposition"])

    def test_every_download_is_logged(self):
        self.grant()
        self.client.get(self.url())
        self.client.get(self.url())
        self.assertEqual(CvAccessLog.objects.filter(inquiry=self.row).count(), 2)
        entry = CvAccessLog.objects.first()
        self.assertEqual(entry.user, self.editor)

    def test_a_refused_download_is_not_logged(self):
        self.client.get(self.url())
        self.assertEqual(CvAccessLog.objects.count(), 0)

    def test_a_purged_cv_answers_gone(self):
        self.grant()
        from django.utils import timezone as tz

        private = self.row.cv
        private.purged_at = tz.now()
        private.save(update_fields=["purged_at"])

        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 410)
        self.assertEqual(response.json()["code"], "cv_purged")

    def test_an_inquiry_without_a_cv_answers_not_found(self):
        self.grant()
        other = Inquiry.objects.create(
            kind="contact",
            name="Omar",
            email="o@e.com",
            phone="+966500000000",
            send_to="ceo",
            message="Please send the profile.",
            idempotency_key=uuid.uuid4(),
            aramco_vendor_id=None,
        )
        self.assertEqual(
            self.client.get(f"/api/v1/admin/inquiries/{other.id}/cv/").status_code, 404
        )
