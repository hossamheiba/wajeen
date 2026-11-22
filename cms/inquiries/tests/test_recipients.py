"""Each "send the message to" role has its own mailbox.

Three promises are tested here:

  - the dashboard can read and change the addresses, and only an editor can;
  - the website's server is told the right address for a message -- the role's
    own, or "" so it falls back to the general inbox -- and only for a general
    enquiry;
  - nothing public ever carries an address: the content API is public, so the
    mailboxes must not be in it.
"""

from __future__ import annotations

import json
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from content.tests.helpers import csrf_token, login, make_editor
from inquiries import vocab
from inquiries.models import RecipientEmail

from .helpers import contact_payload, vendor_payload

PRIVATE = tempfile.mkdtemp(prefix="wjeen-inq-rcpt-")
TOKEN = "test-inquiry-token"
URL = "/api/v1/admin/inquiries/recipients/"


class RecipientsScreenTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        make_editor()
        login(self.client)
        self.token = csrf_token(self.client)

    def put(self, rows, client=None):
        return (client or self.client).put(
            URL, {"recipients": rows}, format="json", HTTP_X_CSRFTOKEN=self.token
        )

    def test_it_lists_every_role_even_before_anything_is_saved(self):
        body = self.client.get(URL).json()
        self.assertEqual([r["code"] for r in body["recipients"]], list(vocab.SEND_TO))
        self.assertTrue(all(r["email"] == "" for r in body["recipients"]))

    def test_an_address_can_be_saved_and_read_back(self):
        response = self.put([{"code": "procurement_manager", "email": "buy@wjeen.com"}])
        self.assertEqual(response.status_code, 200)
        saved = {r["code"]: r["email"] for r in self.client.get(URL).json()["recipients"]}
        self.assertEqual(saved["procurement_manager"], "buy@wjeen.com")
        self.assertEqual(saved["ceo"], "")

    def test_the_editor_who_saved_it_is_recorded(self):
        self.put([{"code": "other", "email": "info@wjeen.com"}])
        self.assertEqual(RecipientEmail.objects.get(code="other").updated_by.username, "editor")

    def test_clearing_an_address_sends_the_role_back_to_the_general_inbox(self):
        self.put([{"code": "other", "email": "info@wjeen.com"}])
        self.put([{"code": "other", "email": ""}])
        self.assertEqual(RecipientEmail.objects.get(code="other").email, "")

    def test_clearing_never_deletes_the_row(self):
        self.put([{"code": "other", "email": "info@wjeen.com"}])
        self.put([{"code": "other", "email": ""}])
        self.assertEqual(RecipientEmail.objects.count(), 1)

    def test_a_malformed_address_is_refused_and_nothing_is_saved(self):
        response = self.put(
            [
                {"code": "human_resources", "email": "hr@wjeen.com"},
                {"code": "other", "email": "not-an-address"},
            ]
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_recipients")
        self.assertEqual(RecipientEmail.objects.count(), 0)

    def test_an_unknown_role_is_refused(self):
        response = self.put([{"code": "janitor", "email": "x@wjeen.com"}])
        self.assertEqual(response.status_code, 400)

    def test_the_same_role_twice_is_refused(self):
        response = self.put(
            [
                {"code": "other", "email": "a@wjeen.com"},
                {"code": "other", "email": "b@wjeen.com"},
            ]
        )
        self.assertEqual(response.status_code, 400)

    def test_surrounding_spaces_are_trimmed(self):
        self.put([{"code": "other", "email": "  info@wjeen.com  "}])
        self.assertEqual(RecipientEmail.objects.get(code="other").email, "info@wjeen.com")

    def test_an_anonymous_visitor_cannot_read_or_change_them(self):
        anonymous = APIClient()
        self.assertIn(anonymous.get(URL).status_code, (401, 403))
        self.assertIn(self.put([], client=anonymous).status_code, (401, 403))

    def test_a_user_who_is_not_staff_cannot(self):
        get_user_model().objects.create_user("visitor", password="correct-horse-battery")
        other = APIClient()
        login(other, "visitor")  # the dashboard does not let a non-staff user in at all
        self.assertIn(other.get(URL).status_code, (401, 403))

    def test_a_save_without_the_csrf_token_is_refused(self):
        strict = APIClient(enforce_csrf_checks=True)
        login(strict)
        response = strict.put(URL, {"recipients": []}, format="json")
        self.assertEqual(response.status_code, 403)


@override_settings(WJEEN_PRIVATE_ROOT=PRIVATE, WJEEN_INQUIRY_TOKEN=TOKEN)
class WhoIsToldTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(PRIVATE, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.client = APIClient()
        RecipientEmail.objects.create(code="procurement_manager", email="buy@wjeen.com")
        RecipientEmail.objects.create(code="human_resources", email="")

    def submit(self, payload):
        return self.client.post(
            "/api/v1/inquiries/",
            payload,
            format="json",
            HTTP_X_FORWARDED_FOR="203.0.113.9",
            HTTP_X_WJEEN_INQUIRY_TOKEN=TOKEN,
        )

    def test_a_message_to_a_role_names_that_roles_mailbox(self):
        response = self.submit(contact_payload(send_to="procurement_manager"))
        self.assertEqual(response.json()["notifyTo"], "buy@wjeen.com")

    def test_a_role_with_no_address_yet_is_the_general_inbox(self):
        self.assertEqual(self.submit(contact_payload(send_to="human_resources")).json()["notifyTo"], "")

    def test_a_role_that_was_never_saved_is_the_general_inbox(self):
        self.assertEqual(self.submit(contact_payload(send_to="ceo")).json()["notifyTo"], "")

    def test_a_vendor_submission_always_goes_to_the_general_inbox(self):
        self.assertEqual(self.submit(vendor_payload()).json()["notifyTo"], "")

    def test_the_retry_list_carries_the_address_too(self):
        self.submit(contact_payload(send_to="procurement_manager"))
        rows = self.client.get(
            "/api/v1/inquiries/pending-notification/", HTTP_X_WJEEN_INQUIRY_TOKEN=TOKEN
        ).json()["results"]
        self.assertEqual(rows[0]["notify_to"], "buy@wjeen.com")

    def test_the_address_is_not_in_what_an_editor_reads_in_the_inbox(self):
        """The inbox lists messages; mailboxes have their own screen."""
        self.submit(contact_payload(send_to="procurement_manager"))
        editor = APIClient()
        make_editor()
        login(editor)
        text = json.dumps(editor.get("/api/v1/admin/inquiries/").json())
        self.assertNotIn("buy@wjeen.com", text)

    def test_the_public_content_api_never_carries_a_mailbox(self):
        text = self.client.get("/api/v1/content/en/").content.decode()
        self.assertNotIn("buy@wjeen.com", text)
