"""
Sign-in throttling.

The shape of these tests matters as much as the counts: the throttle has to
stop a brute force without becoming a way to lock someone out, a way to learn
whether an account exists, or a way around CSRF.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta
from unittest import mock

from django.db import DatabaseError
from rest_framework.test import APIClient

from throttling import limiter
from throttling.models import LoginAttempt

PASSWORD = "correct-horse-battery"
LOGIN = "/api/v1/admin/auth/login/"


def make_client(address="10.0.0.1", enforce_csrf=False):
    client = APIClient(enforce_csrf_checks=enforce_csrf)
    client.defaults["REMOTE_ADDR"] = address
    return client


def attempt(client, username="editor", password="wrong", token=None):
    extra = {"HTTP_X_CSRFTOKEN": token} if token else {}
    return client.post(
        LOGIN, {"username": username, "password": password}, format="json", **extra
    )


@override_settings(LOGIN_THROTTLE_LIMIT=3, LOGIN_THROTTLE_WINDOW=900)
class LoginThrottleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        get_user_model().objects.create_user(
            username="editor", password=PASSWORD, is_staff=True
        )

    # -- 1. the limit bites ----------------------------------------------

    def test_repeated_failures_eventually_return_429(self):
        client = make_client()
        for index in range(3):
            self.assertEqual(attempt(client).status_code, 401, f"attempt {index + 1}")
        self.assertEqual(attempt(client).status_code, 429)

    def test_the_correct_password_is_refused_too_once_throttled(self):
        """Otherwise the throttle would announce when a guess was right."""
        client = make_client()
        for _ in range(3):
            attempt(client)
        self.assertEqual(attempt(client, password=PASSWORD).status_code, 429)

    # -- 2. normal login is untouched below the limit ---------------------

    def test_a_good_password_still_works_below_the_limit(self):
        client = make_client()
        attempt(client)
        attempt(client)
        response = attempt(client, password=PASSWORD)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "editor")

    def test_a_successful_sign_in_forgives_earlier_failures(self):
        client = make_client()
        attempt(client)
        attempt(client)
        self.assertEqual(attempt(client, password=PASSWORD).status_code, 200)
        self.assertEqual(LoginAttempt.objects.count(), 0)
        # The budget is whole again.
        for _ in range(3):
            self.assertEqual(attempt(client).status_code, 401)

    def test_only_failures_are_counted(self):
        client = make_client()
        for _ in range(5):
            attempt(client, password=PASSWORD)
        self.assertEqual(LoginAttempt.objects.count(), 0)

    def test_one_client_cannot_throttle_another(self):
        blocked = make_client("10.0.0.1")
        for _ in range(3):
            attempt(blocked)
        self.assertEqual(attempt(blocked).status_code, 429)

        innocent = make_client("10.0.0.2")
        self.assertEqual(attempt(innocent, password=PASSWORD).status_code, 200)

    # -- 3. authenticated traffic is never throttled ----------------------

    def test_authenticated_studio_requests_are_not_throttled(self):
        client = make_client()
        self.assertEqual(attempt(client, password=PASSWORD).status_code, 200)

        # Far more requests than the login budget, on the same address.
        for _ in range(20):
            self.assertIn(
                client.get("/api/v1/admin/content/").status_code, (200,)
            )
        self.assertEqual(LoginAttempt.objects.count(), 0)

    def test_the_public_read_is_not_throttled(self):
        client = make_client()
        for _ in range(3):
            attempt(client)
        self.assertEqual(attempt(client).status_code, 429)
        self.assertEqual(client.get("/api/v1/content/en/").status_code, 200)

    def test_refresh_is_not_throttled_by_login_failures(self):
        client = make_client()
        self.assertEqual(attempt(client, password=PASSWORD).status_code, 200)
        for _ in range(3):
            attempt(make_client("10.0.0.9"))
        self.assertEqual(client.post("/api/v1/admin/auth/refresh/").status_code, 200)

    # -- 4. CSRF is still required ---------------------------------------

    def test_the_throttle_does_not_bypass_csrf(self):
        """A throttled client with no CSRF token is still a CSRF failure."""
        client = make_client(enforce_csrf=True)
        client.get("/api/v1/admin/auth/csrf/")
        token = client.cookies["wjeen_csrftoken"].value

        for _ in range(3):
            self.assertEqual(attempt(client, token=token).status_code, 401)
        self.assertEqual(attempt(client, token=token).status_code, 429)

        # Same client, same throttled state, no token: CSRF answers first.
        self.assertEqual(attempt(client).status_code, 403)

    def test_a_missing_csrf_token_does_not_consume_the_budget(self):
        client = make_client(enforce_csrf=True)
        client.get("/api/v1/admin/auth/csrf/")
        for _ in range(10):
            self.assertEqual(attempt(client).status_code, 403)
        self.assertEqual(LoginAttempt.objects.count(), 0)

    # -- 5. no account disclosure ----------------------------------------

    def test_the_throttled_response_is_identical_for_unknown_usernames(self):
        real = make_client("10.0.0.3")
        fake = make_client("10.0.0.4")
        for _ in range(3):
            attempt(real, username="editor")
            attempt(fake, username="nobody-at-all")

        blocked_real = attempt(real, username="editor")
        blocked_fake = attempt(fake, username="nobody-at-all")

        self.assertEqual(blocked_real.status_code, blocked_fake.status_code)
        self.assertEqual(blocked_real.json(), blocked_fake.json())

    def test_the_401_is_identical_for_unknown_usernames(self):
        client = make_client()
        known = attempt(client, username="editor")
        unknown = attempt(make_client("10.0.0.5"), username="nobody-at-all")
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.json(), unknown.json())

    def test_the_counter_is_keyed_on_the_client_not_the_username(self):
        client = make_client()
        for name in ("alice", "bob", "carol"):
            attempt(client, username=name)
        # Three different usernames, one client: the budget is spent.
        self.assertEqual(attempt(client, username="editor").status_code, 429)

    # -- 6. the response is deterministic and documented ------------------

    def test_the_throttled_response_shape(self):
        client = make_client()
        for _ in range(3):
            attempt(client)
        response = attempt(client)

        self.assertEqual(response.status_code, 429)
        self.assertEqual(
            response.json(), {"detail": "Too many sign-in attempts. Try again later."}
        )
        retry_after = int(response.headers["Retry-After"])
        self.assertGreater(retry_after, 0)
        self.assertLessEqual(retry_after, 900)

    def test_retry_after_counts_down_as_the_window_ages(self):
        client = make_client()
        for _ in range(3):
            attempt(client)
        fresh = int(attempt(client).headers["Retry-After"])

        LoginAttempt.objects.update(created_at=timezone.now() - timedelta(seconds=600))
        later = int(attempt(client).headers["Retry-After"])
        self.assertLess(later, fresh)

    def test_the_window_expires(self):
        client = make_client()
        for _ in range(3):
            attempt(client)
        self.assertEqual(attempt(client).status_code, 429)

        LoginAttempt.objects.update(created_at=timezone.now() - timedelta(seconds=901))
        self.assertEqual(attempt(client, password=PASSWORD).status_code, 200)


class KeyingTests(TestCase):
    """What the throttle trusts to identify a client."""

    def test_the_key_is_a_hash_not_an_address(self):
        request = mock.Mock(META={"REMOTE_ADDR": "203.0.113.9"})
        key = limiter.client_key(request)
        self.assertEqual(len(key), 64)
        self.assertNotIn("203.0.113.9", key)

    @override_settings(TRUST_PROXY_HEADER=False)
    def test_a_forged_forwarded_header_is_ignored_by_default(self):
        forged = mock.Mock(
            META={"REMOTE_ADDR": "203.0.113.9", "HTTP_X_FORWARDED_FOR": "1.2.3.4"}
        )
        plain = mock.Mock(META={"REMOTE_ADDR": "203.0.113.9"})
        self.assertEqual(limiter.client_key(forged), limiter.client_key(plain))

    @override_settings(TRUST_PROXY_HEADER=True)
    def test_behind_a_trusted_proxy_the_rightmost_entry_wins(self):
        """Everything left of it was supplied by the caller."""
        spoofed = mock.Mock(
            META={
                "REMOTE_ADDR": "10.0.0.1",
                "HTTP_X_FORWARDED_FOR": "9.9.9.9, 203.0.113.9",
            }
        )
        honest = mock.Mock(
            META={"REMOTE_ADDR": "10.0.0.1", "HTTP_X_FORWARDED_FOR": "203.0.113.9"}
        )
        self.assertEqual(limiter.client_key(spoofed), limiter.client_key(honest))

    @override_settings(TRUST_PROXY_HEADER=True)
    def test_a_client_cannot_escape_by_prepending_addresses(self):
        keys = {
            limiter.client_key(
                mock.Mock(
                    META={
                        "REMOTE_ADDR": "10.0.0.1",
                        "HTTP_X_FORWARDED_FOR": f"{noise}, 203.0.113.9",
                    }
                )
            )
            for noise in ("1.1.1.1", "2.2.2.2", "3.3.3.3")
        }
        self.assertEqual(len(keys), 1)


@override_settings(LOGIN_THROTTLE_LIMIT=3)
class FailOpenTests(TestCase):
    """A database that cannot be reached must not lock everyone out."""

    @classmethod
    def setUpTestData(cls):
        get_user_model().objects.create_user(
            username="editor", password=PASSWORD, is_staff=True
        )

    def test_a_broken_limiter_allows_the_request(self):
        with mock.patch(
            "throttling.limiter.LoginAttempt.objects.filter",
            side_effect=DatabaseError("no connection"),
        ):
            self.assertTrue(limiter.check("anything").allowed)

    def test_recording_a_failure_never_raises(self):
        with mock.patch(
            "throttling.limiter.LoginAttempt.objects.create",
            side_effect=DatabaseError("no connection"),
        ):
            limiter.record_failure("anything")

    def test_login_still_works_when_the_limiter_is_down(self):
        with mock.patch("throttling.limiter.check", return_value=limiter.Verdict(True)):
            with mock.patch("throttling.limiter.record_failure"):
                with mock.patch("throttling.limiter.clear"):
                    response = attempt(make_client(), password=PASSWORD)
        self.assertEqual(response.status_code, 200)
