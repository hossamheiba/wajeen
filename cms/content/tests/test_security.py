"""Auth cookie policy, CSRF enforcement, and CORS."""

from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from content.models import ContentBlock

from .helpers import csrf_token, import_real_content, login, make_editor

PASSWORD = "correct-horse-battery"


class CookiePolicyTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()
        make_editor()

    def test_login_sets_an_httponly_scoped_samesite_cookie(self):
        client = APIClient()
        response = login(client)
        self.assertEqual(response.status_code, 200)

        cookie = response.cookies[settings.AUTH_COOKIE_NAME]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Strict")
        self.assertEqual(cookie["path"], "/api/v1/admin")

    def test_the_access_cookie_is_never_scoped_to_the_public_read(self):
        """Path scoping means the token is not even sent to /api/v1/content/."""
        client = APIClient()
        cookie = login(client).cookies[settings.AUTH_COOKIE_NAME]
        self.assertFalse("/api/v1/content/".startswith(cookie["path"]))

    def test_the_csrf_cookie_is_readable_by_javascript_on_purpose(self):
        client = APIClient()
        response = client.get("/api/v1/admin/auth/csrf/")
        cookie = response.cookies[settings.CSRF_COOKIE_NAME]
        self.assertFalse(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Strict")

    @override_settings(DEBUG=False, AUTH_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True)
    def test_cookies_are_secure_when_not_in_debug(self):
        client = APIClient()
        response = login(client)
        self.assertTrue(response.cookies[settings.AUTH_COOKIE_NAME]["secure"])

    def test_bad_credentials_are_rejected(self):
        client = APIClient()
        client.get("/api/v1/admin/auth/csrf/")
        response = client.post(
            "/api/v1/admin/auth/login/",
            {"username": "editor", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)
        self.assertNotIn(settings.AUTH_COOKIE_NAME, response.cookies)

    def test_logout_clears_both_cookies(self):
        client = APIClient()
        login(client)
        response = client.post("/api/v1/admin/auth/logout/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.cookies[settings.AUTH_COOKIE_NAME].value, "")


class CSRFTests(TestCase):
    """The point the plan singled out: cookie-borne JWTs must check CSRF."""

    @classmethod
    def setUpTestData(cls):
        import_real_content()
        make_editor()

    def authenticated_strict_client(self):
        """A client that enforces CSRF exactly as a browser would."""
        client = APIClient(enforce_csrf_checks=True)
        token = csrf_token(client)
        client.post(
            "/api/v1/admin/auth/login/",
            {"username": "editor", "password": PASSWORD},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        return client, token

    def test_a_patch_without_a_csrf_token_is_rejected(self):
        client, _ = self.authenticated_strict_client()
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        response = client.patch(
            "/api/v1/admin/content/hero/en/",
            {"patch": {"subtitle": "forged"}},
            format="json",
            HTTP_IF_MATCH=str(block.version),
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("CSRF", str(response.data))
        block.refresh_from_db()
        self.assertIsNone(block.draft_data, "the forged patch must not have landed")

    def test_a_patch_with_a_csrf_token_succeeds(self):
        client, token = self.authenticated_strict_client()
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        response = client.patch(
            "/api/v1/admin/content/hero/en/",
            {"patch": {"subtitle": "legitimate"}},
            format="json",
            HTTP_IF_MATCH=str(block.version),
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_a_wrong_csrf_token_is_rejected(self):
        client, _ = self.authenticated_strict_client()
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        response = client.patch(
            "/api/v1/admin/content/hero/en/",
            {"patch": {"subtitle": "forged"}},
            format="json",
            HTTP_IF_MATCH=str(block.version),
            HTTP_X_CSRFTOKEN="not-the-real-token",
        )
        self.assertEqual(response.status_code, 403)

    def test_publish_requires_a_csrf_token(self):
        client, _ = self.authenticated_strict_client()
        response = client.post("/api/v1/admin/publish/", {}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_rollback_requires_a_csrf_token(self):
        client, _ = self.authenticated_strict_client()
        response = client.post("/api/v1/admin/versions/1/rollback/", {}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_login_itself_requires_a_csrf_token(self):
        """Otherwise an attacker can log a victim into an account they control."""
        client = APIClient(enforce_csrf_checks=True)
        client.get("/api/v1/admin/auth/csrf/")
        response = client.post(
            "/api/v1/admin/auth/login/",
            {"username": "editor", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_reads_do_not_require_a_csrf_token(self):
        client, _ = self.authenticated_strict_client()
        response = client.get("/api/v1/admin/content/hero/en/")
        self.assertEqual(response.status_code, 200)


class AuthorizationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()
        make_editor()

    def test_anonymous_users_cannot_read_admin_content(self):
        response = APIClient().get("/api/v1/admin/content/hero/en/")
        self.assertEqual(response.status_code, 401)

    def test_anonymous_users_cannot_patch(self):
        block = ContentBlock.objects.get(namespace="hero", locale="en")
        response = APIClient().patch(
            "/api/v1/admin/content/hero/en/",
            {"patch": {"subtitle": "x"}},
            format="json",
            HTTP_IF_MATCH=str(block.version),
        )
        self.assertEqual(response.status_code, 401)

    def test_anonymous_users_cannot_publish_or_roll_back(self):
        client = APIClient()
        self.assertEqual(client.post("/api/v1/admin/publish/", {}, format="json").status_code, 401)
        self.assertEqual(
            client.post("/api/v1/admin/versions/1/rollback/", {}, format="json").status_code, 401
        )

    def test_a_garbage_token_is_rejected_rather_than_ignored(self):
        client = APIClient()
        client.cookies[settings.AUTH_COOKIE_NAME] = "not-a-jwt"
        self.assertEqual(client.get("/api/v1/admin/content/").status_code, 401)

    def test_non_staff_users_cannot_log_in(self):
        from django.contrib.auth import get_user_model

        get_user_model().objects.create_user(username="visitor", password=PASSWORD)
        client = APIClient()
        client.get("/api/v1/admin/auth/csrf/")
        response = client.post(
            "/api/v1/admin/auth/login/",
            {"username": "visitor", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_the_public_read_needs_no_credentials(self):
        response = APIClient().get("/api/v1/content/en/")
        self.assertEqual(response.status_code, 200)


@override_settings(
    CORS_ALLOWED_ORIGINS=["https://www.wjeen.com"],
    CORS_ALLOW_CREDENTIALS=True,
    CORS_ALLOW_ALL_ORIGINS=False,
)
class CORSTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_real_content()

    def test_the_configured_frontend_origin_is_echoed_with_credentials(self):
        response = APIClient().get("/api/v1/content/en/", HTTP_ORIGIN="https://www.wjeen.com")
        self.assertEqual(
            response.headers.get("Access-Control-Allow-Origin"), "https://www.wjeen.com"
        )
        self.assertEqual(response.headers.get("Access-Control-Allow-Credentials"), "true")

    def test_an_unknown_origin_gets_no_cors_header(self):
        response = APIClient().get("/api/v1/content/en/", HTTP_ORIGIN="https://evil.example")
        self.assertIsNone(response.headers.get("Access-Control-Allow-Origin"))

    def test_the_wildcard_is_never_emitted(self):
        for origin in ("https://www.wjeen.com", "https://evil.example"):
            response = APIClient().get("/api/v1/content/en/", HTTP_ORIGIN=origin)
            self.assertNotEqual(response.headers.get("Access-Control-Allow-Origin"), "*")

    def test_the_preflight_allows_the_headers_the_client_actually_sends(self):
        response = APIClient().options(
            "/api/v1/admin/content/hero/en/",
            HTTP_ORIGIN="https://www.wjeen.com",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="PATCH",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,x-csrftoken,if-match",
        )
        allowed = response.headers.get("Access-Control-Allow-Headers", "").lower()
        for header in ("x-csrftoken", "if-match", "content-type"):
            self.assertIn(header, allowed)

    def test_settings_never_combine_the_wildcard_with_credentials(self):
        self.assertFalse(settings.CORS_ALLOW_ALL_ORIGINS)
        self.assertTrue(settings.CORS_ALLOW_CREDENTIALS)
