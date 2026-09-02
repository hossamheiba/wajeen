"""
The Stage 3B API.

Public surface is one read endpoint. Everything that can change content sits
under /api/v1/admin, is cookie-authenticated, and carries a CSRF token.

Preconditions are expressed with If-Match, and the two kinds never mix:

    PATCH   If-Match: <ContentBlock.version>    one namespace, one locale
    publish If-Match: <ContentVersion.number>   the global published revision
    rollback If-Match: <ContentVersion.number>  the global published revision
"""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import authenticate
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import ContentBlock, ContentVersion
from ..services import publishing
from ..services.assembler import DRAFT, PUBLISHED, assemble_locale
from ..services.errors import (
    ConcurrencyError,
    KeyLossError,
    NothingToPublishError,
    UnknownBlockError,
    UnknownVersionError,
)
from ..services.patching import apply_patch, discard_draft
from throttling import limiter
from .auth import enforce_csrf
from .serializers import (
    BlockSerializer,
    LoginSerializer,
    PatchSerializer,
    PublishSerializer,
    RollbackSerializer,
    VersionSerializer,
)

PRECONDITION_FAILED = status.HTTP_412_PRECONDITION_FAILED


def read_if_match(request) -> int | None:
    """Accept `If-Match: 7` and `If-Match: "7"` alike; ignore `*`."""
    raw = request.headers.get("If-Match")
    if raw is None:
        return None
    raw = raw.strip()
    if raw == "*":
        return None
    if raw.startswith("W/"):
        raw = raw[2:].strip()
    raw = raw.strip('"')
    try:
        return int(raw)
    except ValueError:
        return None


def problem(message: str, code: int) -> Response:
    return Response({"detail": message}, status=code)


# ---------------------------------------------------------------- auth


class CSRFView(APIView):
    """Hands out the double-submit token. Must be called before any mutation."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        from django.middleware.csrf import get_token

        return Response({"csrfToken": get_token(request)})


def _set_auth_cookies(response: Response, refresh: RefreshToken) -> Response:
    """HttpOnly, Secure, SameSite=Strict, and scoped to the admin path.

    Scoping matters: the access cookie is never attached to the public content
    read, so a leak there is impossible rather than merely unlikely.
    """
    response.set_cookie(
        settings.AUTH_COOKIE_NAME,
        str(refresh.access_token),
        httponly=settings.AUTH_COOKIE_HTTPONLY,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=settings.AUTH_COOKIE_PATH,
        domain=settings.AUTH_COOKIE_DOMAIN,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
    )
    response.set_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        str(refresh),
        httponly=settings.AUTH_COOKIE_HTTPONLY,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=settings.AUTH_REFRESH_COOKIE_PATH,
        domain=settings.AUTH_COOKIE_DOMAIN,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
    )
    return response


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # Login is a mutation too: without this check an attacker's page could
        # silently log a victim into an account it controls.
        #
        # Checked before the throttle on purpose: a request with no CSRF token
        # is rejected whether or not the client is throttled, so the throttle
        # can never become a way around it.
        enforce_csrf(request)

        key = limiter.client_key(request)
        verdict = limiter.check(key)
        if not verdict.allowed:
            # Identical for every caller: same status, same wording, no hint
            # about whether the username exists or the password was close.
            return Response(
                {"detail": "Too many sign-in attempts. Try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(verdict.retry_after)},
            )

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None or not user.is_active or not user.is_staff:
            limiter.record_failure(key)
            return problem("Invalid credentials.", status.HTTP_401_UNAUTHORIZED)

        # A real sign-in forgives whatever came before it, so one mistyped
        # password does not follow an editor around for the next 15 minutes.
        limiter.clear(key)

        refresh = RefreshToken.for_user(user)
        response = Response({"username": user.get_username()})
        return _set_auth_cookies(response, refresh)


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        enforce_csrf(request)
        raw = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME)
        if not raw:
            return problem("No refresh cookie.", status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(raw)
        except Exception:
            return problem("Invalid refresh token.", status.HTTP_401_UNAUTHORIZED)
        return _set_auth_cookies(Response({"refreshed": True}), refresh)


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        enforce_csrf(request)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(settings.AUTH_COOKIE_NAME, path=settings.AUTH_COOKIE_PATH)
        response.delete_cookie(
            settings.AUTH_REFRESH_COOKIE_NAME, path=settings.AUTH_REFRESH_COOKIE_PATH
        )
        return response


# ---------------------------------------------------------------- public read


class PublicMessagesView(APIView):
    """The published messages for one locale, in next-intl's exact shape.

    Not wired into the site: src/i18n/request.ts still imports the repository
    JSON, and switching it over is explicitly out of scope for Stage 3B.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, locale: str):
        if locale not in settings.CONTENT_LOCALES:
            return problem(f"Unknown locale {locale!r}.", status.HTTP_404_NOT_FOUND)
        current = publishing.current_version()
        response = Response(assemble_locale(locale, PUBLISHED))
        response["ETag"] = f'"{current.number if current else 0}"'
        return response


# ---------------------------------------------------------------- admin content


class BlockListView(APIView):
    def get(self, request):
        blocks = ContentBlock.objects.all()
        payload = BlockSerializer(
            [
                {
                    "namespace": block.namespace,
                    "locale": block.locale,
                    "version": block.version,
                    "has_draft": block.has_draft,
                    "updated_at": block.updated_at,
                }
                for block in blocks
            ],
            many=True,
        ).data
        current = publishing.current_version()
        return Response(
            {
                "blocks": payload,
                "pendingDrafts": sum(1 for block in blocks if block.has_draft),
                "currentRevision": current.number if current else None,
            }
        )


class BlockDetailView(APIView):
    """One namespace in one locale: read it, patch it, or drop its draft."""

    def _load(self, namespace: str, locale: str) -> ContentBlock | None:
        return ContentBlock.objects.filter(namespace=namespace, locale=locale).first()

    def get(self, request, namespace: str, locale: str):
        block = self._load(namespace, locale)
        if block is None:
            return problem(f"No content block for {namespace}[{locale}].", status.HTTP_404_NOT_FOUND)
        response = Response(
            {
                "namespace": block.namespace,
                "locale": block.locale,
                "version": block.version,
                "hasDraft": block.has_draft,
                "published": block.published_data,
                "draft": block.draft_data,
                "effective": block.effective_data,
            }
        )
        response["ETag"] = f'"{block.version}"'
        return response

    def patch(self, request, namespace: str, locale: str):
        serializer = PatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        header_version = read_if_match(request)
        body_version = data.get("version")
        if header_version is None and body_version is None:
            return problem(
                "A precondition is required: send If-Match with the block version.",
                PRECONDITION_FAILED,
            )
        if header_version is not None and body_version is not None and header_version != body_version:
            return problem(
                "If-Match and the body version disagree.", status.HTTP_400_BAD_REQUEST
            )
        expected = header_version if header_version is not None else body_version

        try:
            block = apply_patch(
                namespace=namespace,
                locale=locale,
                path=data["path"],
                patch=data["patch"],
                expected_version=expected,
                user=request.user,
            )
        except ConcurrencyError as exc:
            return problem(str(exc), PRECONDITION_FAILED)
        except KeyLossError as exc:
            return problem(str(exc), status.HTTP_409_CONFLICT)
        except UnknownBlockError as exc:
            return problem(str(exc), status.HTTP_404_NOT_FOUND)

        response = Response(
            {
                "namespace": block.namespace,
                "locale": block.locale,
                "version": block.version,
                "hasDraft": block.has_draft,
                "draft": block.draft_data,
            }
        )
        response["ETag"] = f'"{block.version}"'
        return response

    def delete(self, request, namespace: str, locale: str):
        expected = read_if_match(request)
        if expected is None:
            return problem("A precondition is required: send If-Match.", PRECONDITION_FAILED)
        try:
            block = discard_draft(
                namespace=namespace, locale=locale, expected_version=expected
            )
        except ConcurrencyError as exc:
            return problem(str(exc), PRECONDITION_FAILED)
        except UnknownBlockError as exc:
            return problem(str(exc), status.HTTP_404_NOT_FOUND)
        return Response({"namespace": block.namespace, "version": block.version})


class DraftMessagesView(APIView):
    """The editor's view of a locale: drafts where they exist, published elsewhere."""

    def get(self, request, locale: str):
        if locale not in settings.CONTENT_LOCALES:
            return problem(f"Unknown locale {locale!r}.", status.HTTP_404_NOT_FOUND)
        return Response(assemble_locale(locale, DRAFT))


# ---------------------------------------------------------------- versions


class PublishView(APIView):
    def post(self, request):
        serializer = PublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            version = publishing.publish(
                user=request.user,
                label=serializer.validated_data["label"],
                if_match=read_if_match(request),
            )
        except ConcurrencyError as exc:
            return problem(str(exc), PRECONDITION_FAILED)
        except NothingToPublishError as exc:
            return problem(str(exc), status.HTTP_409_CONFLICT)
        return Response(
            {"number": version.number, "source": version.source, "label": version.label},
            status=status.HTTP_201_CREATED,
        )


class VersionListView(APIView):
    def get(self, request):
        versions = ContentVersion.objects.select_related("rolled_back_from").all()
        return Response(
            {
                "versions": VersionSerializer(
                    [
                        {
                            "number": version.number,
                            "label": version.label,
                            "source": version.source,
                            "is_current": version.is_current,
                            "rolled_back_from": version.rolled_back_from,
                            "created_at": version.created_at,
                        }
                        for version in versions
                    ],
                    many=True,
                ).data
            }
        )


class VersionDetailView(APIView):
    """One revision, snapshot included.

    The rollback screen needs the snapshot to diff a past revision against what
    is published now, before anyone commits to restoring it.
    """

    def get(self, request, number: int):
        version = (
            ContentVersion.objects.select_related("rolled_back_from")
            .filter(number=number)
            .first()
        )
        if version is None:
            return problem(
                f"No published revision numbered {number}.", status.HTTP_404_NOT_FOUND
            )
        return Response(
            {
                "number": version.number,
                "label": version.label,
                "source": version.source,
                "isCurrent": version.is_current,
                "rolledBackFrom": (
                    version.rolled_back_from.number if version.rolled_back_from else None
                ),
                "createdAt": version.created_at,
                "createdBy": (
                    version.created_by.get_username() if version.created_by else None
                ),
                "snapshot": version.snapshot,
            }
        )


class RollbackView(APIView):
    def post(self, request, number: int):
        serializer = RollbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            version = publishing.rollback(
                target_number=number,
                user=request.user,
                label=serializer.validated_data["label"],
                if_match=read_if_match(request),
            )
        except ConcurrencyError as exc:
            return problem(str(exc), PRECONDITION_FAILED)
        except UnknownVersionError as exc:
            return problem(str(exc), status.HTTP_404_NOT_FOUND)
        return Response(
            {
                "number": version.number,
                "source": version.source,
                "rolledBackFrom": version.rolled_back_from.number,
            },
            status=status.HTTP_201_CREATED,
        )
