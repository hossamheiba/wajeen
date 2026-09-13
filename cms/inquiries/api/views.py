"""The inquiry endpoints.

Two audiences, two postures:

  - **One submission endpoint**, called server-to-server by the Next.js route
    handler and never by a browser. It is unauthenticated in the session sense
    and gated by a shared secret, because there is no user to authenticate --
    the visitor is anonymous by definition. Rate limited in Postgres on top of
    the limiter the site already applies.

  - **The dashboard endpoints**, behind the same HttpOnly JWT cookie and CSRF
    policy as the content API, plus `is_staff`. Downloading a CV needs one
    more grant on top of that.

There is deliberately no DELETE. A message is archived; a record of who
contacted the company is not something a dashboard should be able to erase.
"""

from __future__ import annotations

import hmac

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import CvAccessLog, Inquiry
from ..services import ConflictingReplay, mark_notified, record
from ..throttle import check as throttle_check
from ..throttle import hash_address
from .serializers import InquirySerializer, StatusSerializer, SubmissionSerializer

PAGE_SIZE = 50


def problem(message: str, status_code: int, **extra) -> Response:
    """The error shape the rest of the API uses: a sentence, then a code."""
    return Response({"detail": message, **extra}, status=status_code)


def _staff(request) -> bool:
    user = request.user
    return bool(user and user.is_authenticated and user.is_active and user.is_staff)


def _has_token(request) -> bool:
    """The shared secret the website's server presents.

    Used by the endpoints the Next.js server calls on its own behalf, where
    there is no user and therefore no session to authenticate. A missing
    setting closes them rather than opening them.
    """
    secret = settings.WJEEN_INQUIRY_TOKEN
    sent = request.headers.get("X-Wjeen-Inquiry-Token", "")
    return bool(secret) and hmac.compare_digest(secret, sent)


class SubmitView(APIView):
    """`POST /api/v1/inquiries/` -- the website's only way in."""

    authentication_classes: list = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        # Constant-time comparison, and a configured secret is mandatory: an
        # empty setting must close the endpoint rather than open it to everyone.
        if not _has_token(request):
            return problem("Not allowed.", status.HTTP_403_FORBIDDEN, code="bad_token")

        ip_hash = hash_address(
            (request.headers.get("X-Forwarded-For", "").split(",")[0] or "").strip()
        )
        verdict = throttle_check(ip_hash)
        if not verdict.ok:
            response = problem(
                "Too many submissions from this address. Please try again later.",
                status.HTTP_429_TOO_MANY_REQUESTS,
                code="throttled",
            )
            response["Retry-After"] = str(verdict.retry_after)
            return response

        serializer = SubmissionSerializer(data=request.data)
        if not serializer.is_valid():
            return problem(
                "That submission is not valid.",
                status.HTTP_400_BAD_REQUEST,
                code="invalid_submission",
                errors=serializer.errors,
            )

        data = dict(serializer.validated_data)
        upload = data.pop("cv", None)
        data["source_ip_hash"] = ip_hash
        data["user_agent"] = request.headers.get("User-Agent", "")

        try:
            inquiry, created = record(
                data, cv=upload, cv_name=getattr(upload, "name", "") if upload else ""
            )
        except ConflictingReplay as clash:
            # The same key for different content. Refusing loudly is the only
            # honest answer: overwriting would lose one submission and
            # ignoring would lose the other.
            return problem(
                "That submission reference was already used for different content.",
                status.HTTP_409_CONFLICT,
                code="idempotency_conflict",
                inquiry=clash.existing.id,
            )
        except DjangoValidationError as invalid:
            return problem(
                "; ".join(invalid.messages),
                status.HTTP_400_BAD_REQUEST,
                code="invalid_attachment",
            )

        return Response(
            {"id": inquiry.id, "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class InquiryListView(APIView):
    """The inbox."""

    def get(self, request):
        if not _staff(request):
            return problem("Not allowed.", status.HTTP_403_FORBIDDEN)

        rows = Inquiry.objects.select_related("cv", "handled_by")

        kind = request.query_params.get("kind")
        if kind:
            rows = rows.filter(kind=kind)
        state = request.query_params.get("status")
        if state:
            rows = rows.filter(status=state)
        if request.query_params.get("notified") == "false":
            rows = rows.filter(notified=False)

        search = (request.query_params.get("search") or "").strip()
        if search:
            from django.db.models import Q

            rows = rows.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(company_name__icontains=search)
            )

        total = rows.count()
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1
        start = (page - 1) * PAGE_SIZE
        window = rows[start : start + PAGE_SIZE]

        return Response(
            {
                "results": InquirySerializer(window, many=True).data,
                "total": total,
                "page": page,
                "pageSize": PAGE_SIZE,
                "counts": self._counts(),
            }
        )

    @staticmethod
    def _counts() -> dict:
        """Unread per kind, plus anything the notification never reached.

        Cheap enough to send with every list: it is what the tabs and the
        warning badge are drawn from, and a second round trip for four
        integers would be worse.
        """
        from django.db.models import Count, Q

        counts = Inquiry.objects.aggregate(
            new=Count("id", filter=Q(status=Inquiry.Status.NEW)),
            contact=Count(
                "id", filter=Q(kind=Inquiry.Kind.CONTACT, status=Inquiry.Status.NEW)
            ),
            vendor=Count(
                "id", filter=Q(kind=Inquiry.Kind.VENDOR, status=Inquiry.Status.NEW)
            ),
            career=Count(
                "id", filter=Q(kind=Inquiry.Kind.CAREER, status=Inquiry.Status.NEW)
            ),
            unnotified=Count("id", filter=Q(notified=False)),
        )
        return counts


class InquiryDetailView(APIView):
    def _load(self, pk: int) -> Inquiry | None:
        return Inquiry.objects.select_related("cv", "handled_by").filter(pk=pk).first()

    def get(self, request, pk: int):
        if not _staff(request):
            return problem("Not allowed.", status.HTTP_403_FORBIDDEN)
        inquiry = self._load(pk)
        if inquiry is None:
            return problem("No such inquiry.", status.HTTP_404_NOT_FOUND)
        return Response(InquirySerializer(inquiry).data)

    def patch(self, request, pk: int):
        """Only the status moves. Everything a visitor typed is immutable."""
        if not _staff(request):
            return problem("Not allowed.", status.HTTP_403_FORBIDDEN)
        inquiry = self._load(pk)
        if inquiry is None:
            return problem("No such inquiry.", status.HTTP_404_NOT_FOUND)

        serializer = StatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inquiry.mark(serializer.validated_data["status"], user=request.user)
        return Response(InquirySerializer(self._load(pk)).data)


class CvDownloadView(APIView):
    """The only route to an applicant's CV.

    `is_staff` is not enough: `inquiries.view_cv` is a separate grant, so
    somebody can triage the inbox without being able to open anyone's CV. The
    check is here as well as in the dashboard's UI, because hiding a button is
    not access control.
    """

    def get(self, request, pk: int):
        if not _staff(request):
            return problem("Not allowed.", status.HTTP_403_FORBIDDEN)
        if not request.user.has_perm("inquiries.view_cv"):
            return problem(
                "You do not have permission to download CVs.",
                status.HTTP_403_FORBIDDEN,
                code="cv_permission_required",
            )

        inquiry = Inquiry.objects.select_related("cv").filter(pk=pk).first()
        if inquiry is None or inquiry.cv_id is None:
            return problem("No CV on that inquiry.", status.HTTP_404_NOT_FOUND)
        if not inquiry.cv.is_available:
            return problem(
                "That CV has passed its retention period and was deleted.",
                status.HTTP_410_GONE,
                code="cv_purged",
            )

        # Recorded before the bytes leave: personal data being read leaves a
        # trace, and a trace written afterwards can be lost to a failed stream.
        CvAccessLog.objects.create(
            inquiry=inquiry,
            user=request.user,
            ip_hash=hash_address(
                (request.headers.get("X-Forwarded-For", "").split(",")[0] or "").strip()
            ),
        )

        safe_name = f"cv-{inquiry.id}{'.pdf' if 'pdf' in inquiry.cv.content_type else '.docx'}"
        response = FileResponse(
            inquiry.cv.file.open("rb"),
            content_type=inquiry.cv.content_type,
            as_attachment=True,
            filename=safe_name,
        )
        # Never rendered inline, never sniffed, never cached by a proxy.
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        response["Content-Disposition"] = f'attachment; filename="{safe_name}"'
        return response


class NotifyRetryView(APIView):
    """Send the notification for one inquiry again, by hand."""

    def post(self, request, pk: int):
        if not _staff(request):
            return problem("Not allowed.", status.HTTP_403_FORBIDDEN)
        inquiry = Inquiry.objects.filter(pk=pk).first()
        if inquiry is None:
            return problem("No such inquiry.", status.HTTP_404_NOT_FOUND)

        # Django does not send the email -- the Next.js server owns delivery,
        # because that is where the provider credentials live. Clearing the
        # flags is what makes the site's retry command pick this row up again.
        inquiry.notified = False
        inquiry.notify_attempts = 0
        inquiry.notify_error = ""
        inquiry.save(update_fields=["notified", "notify_attempts", "notify_error"])
        return Response({"queued": True})


class NotifyResultView(APIView):
    """`PATCH /api/v1/inquiries/<id>/notified/` -- how delivery went.

    Django stores submissions; the Next.js server sends the email, because
    that is where the provider credentials live. So the delivery outcome has
    to come back, and it comes back here.

    Token-gated rather than session-gated: the caller is a server, not a
    person. `notified=false` with a reason is a state the dashboard shows, not
    a log line somebody has to go looking for.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def patch(self, request, pk: int):
        if not _has_token(request):
            return problem("Not allowed.", status.HTTP_403_FORBIDDEN, code="bad_token")

        inquiry = Inquiry.objects.filter(pk=pk).first()
        if inquiry is None:
            return problem("No such inquiry.", status.HTTP_404_NOT_FOUND)

        mark_notified(inquiry, error=str(request.data.get("error") or ""))
        return Response(
            {
                "notified": inquiry.notified,
                "attempts": inquiry.notify_attempts,
            }
        )


class PendingNotificationView(APIView):
    """`GET /api/v1/inquiries/pending-notification/` -- what still needs sending.

    The website's retry command reads this, sends each one, and reports back
    through NotifyResultView. Rows past `WJEEN_NOTIFY_MAX_ATTEMPTS` are left
    out: at that point it is a person's problem, and the dashboard is already
    showing the badge.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request):
        if not _has_token(request):
            return problem("Not allowed.", status.HTTP_403_FORBIDDEN, code="bad_token")

        rows = (
            Inquiry.objects.select_related("cv")
            .filter(
                notified=False,
                notify_attempts__lt=settings.WJEEN_NOTIFY_MAX_ATTEMPTS,
            )
            .order_by("created_at")[:25]
        )
        return Response({"results": InquirySerializer(rows, many=True).data})
