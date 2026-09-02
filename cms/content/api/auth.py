"""
Cookie-borne JWT authentication that actually enforces CSRF.

This is the one piece the plan called out as a real hole rather than a
formality. DRF's SessionAuthentication runs a CSRF check; JWTAuthentication
does not, because a bearer token in an Authorization header is not
automatically attached by the browser and so is not forgeable cross-site.

The moment the token moves into a cookie that assumption dies: the browser
sends it on every request, including one triggered by an attacker's page.
So the check that SessionAuthentication does for free has to be done here,
explicitly, for every unsafe method.
"""

from django.middleware.csrf import CsrfViewMiddleware
from django.utils.translation import gettext_lazy as _
from rest_framework import exceptions
from rest_framework.authentication import BaseAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})


class _ForbiddenCSRF(CsrfViewMiddleware):
    """Turns Django's CSRF rejection into an exception instead of a response."""

    def _reject(self, request, reason):
        raise exceptions.PermissionDenied(f"CSRF failed: {reason}")


def enforce_csrf(request) -> None:
    check = _ForbiddenCSRF(lambda req: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason is not None:
        raise exceptions.PermissionDenied("CSRF failed.")


class CSRFEnforcedJWTCookieAuthentication(BaseAuthentication):
    """Reads the access token from an HttpOnly cookie, then checks CSRF.

    Order matters: the token is validated first so an anonymous request gets a
    401 rather than a confusing CSRF error, and CSRF is checked only for
    unsafe methods -- reads cannot mutate anything.
    """

    def __init__(self):
        self._jwt = JWTAuthentication()

    def authenticate(self, request):
        from django.conf import settings

        raw = request.COOKIES.get(settings.AUTH_COOKIE_NAME)
        if not raw:
            return None

        try:
            token = self._jwt.get_validated_token(raw)
        except (InvalidToken, TokenError) as exc:
            raise exceptions.AuthenticationFailed(_("Invalid or expired token.")) from exc

        user = self._jwt.get_user(token)

        if request.method not in SAFE_METHODS:
            enforce_csrf(request)

        return (user, token)

    def authenticate_header(self, request):
        return "Cookie"
