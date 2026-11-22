"""An editor changes their own password from the studio."""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .helpers import csrf_token, login, make_editor

URL = "/api/v1/admin/account/password/"
OLD = "correct-horse-battery"
NEW = "a-much-better-passphrase-9"


class PasswordChangeTests(TestCase):
    def setUp(self):
        make_editor()
        self.client = APIClient()
        self.assertEqual(login(self.client).status_code, 200)

    def change(self, current=OLD, new=NEW, client=None):
        client = client or self.client
        return client.post(
            URL,
            {"current_password": current, "new_password": new},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token(client),
        )

    def password_works(self, password):
        return get_user_model().objects.get(username="editor").check_password(password)

    def test_a_signed_out_visitor_cannot_use_it(self):
        response = self.change(client=APIClient())
        self.assertEqual(response.status_code, 401)
        self.assertTrue(self.password_works(OLD))

    def test_it_needs_a_csrf_token(self):
        strict = APIClient(enforce_csrf_checks=True)
        login(strict)
        response = strict.post(
            URL, {"current_password": OLD, "new_password": NEW}, format="json"
        )
        self.assertEqual(response.status_code, 403)
        self.assertTrue(self.password_works(OLD))

    def test_the_password_changes_and_the_old_one_stops_working(self):
        response = self.change()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"changed": True})
        self.assertTrue(self.password_works(NEW))
        self.assertFalse(self.password_works(OLD))
        # And signing in with the new one works, the old one is refused.
        self.assertEqual(login(APIClient(), password=NEW).status_code, 200)
        self.assertEqual(login(APIClient(), password=OLD).status_code, 401)

    def test_the_editor_stays_signed_in_on_this_browser(self):
        response = self.change()
        self.assertIn(settings.AUTH_COOKIE_NAME, response.cookies)
        self.assertEqual(self.client.get("/api/v1/admin/content/").status_code, 200)

    def test_a_wrong_current_password_is_a_400_not_a_401(self):
        response = self.change(current="not-my-password")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "wrong_current")
        self.assertTrue(self.password_works(OLD))

    def test_the_new_password_must_differ(self):
        response = self.change(new=OLD)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "same_password")

    def test_weak_passwords_are_refused_with_their_reasons(self):
        for weak, code in [
            ("short1", "password_too_short"),
            ("password123", "password_too_common"),
            ("8472951630481", "password_entirely_numeric"),
            ("editor12", "password_too_similar"),
        ]:
            with self.subTest(weak=weak):
                response = self.change(new=weak)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json()["code"], "weak_password")
                self.assertIn(code, response.json()["codes"])
        self.assertTrue(self.password_works(OLD))

    def test_missing_fields_are_a_400(self):
        response = self.client.post(
            URL, {"new_password": NEW}, format="json", HTTP_X_CSRFTOKEN=csrf_token(self.client)
        )
        self.assertEqual(response.status_code, 400)

    @override_settings(LOGIN_THROTTLE_LIMIT=3)
    def test_guessing_the_current_password_is_throttled(self):
        for _ in range(3):
            self.assertEqual(self.change(current="guess").status_code, 400)
        blocked = self.change(current="guess")
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("Retry-After", blocked.headers)
        # Even the right password is held off while the window is full.
        self.assertEqual(self.change().status_code, 429)
        self.assertTrue(self.password_works(OLD))

    def test_a_success_forgives_earlier_typos(self):
        for _ in range(2):
            self.change(current="guess")
        self.assertEqual(self.change().status_code, 200)

    def test_it_only_changes_the_signed_in_editors_own_password(self):
        other = make_editor("someone-else", "another-long-passphrase-1")
        self.change()
        other.refresh_from_db()
        self.assertTrue(other.check_password("another-long-passphrase-1"))
