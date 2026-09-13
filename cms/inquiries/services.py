"""Storing a submission, and deciding what a repeat means.

One entry point, `record`, used by the API and by every test, so there is a
single answer to "what happens when this arrives twice".

Idempotency is settled here rather than in the view because the rule has three
outcomes, not two:

    same key, same payload      -> the row that already exists, created=False
    same key, different payload -> ConflictingReplay, answered 409
    new key                     -> a new row, created=True

The middle case matters. A client that retries after a timeout sends the same
key and the same payload and must not create a second enquiry. A client that
reuses a key for different content is either confused or malicious, and
silently overwriting or silently ignoring would both lose a real submission --
so it is refused loudly and the caller is told.

The fingerprint covers the fields a person filled in. It deliberately excludes
everything operational -- the hashed address, the user agent, notification
state -- because those can differ between two honest attempts at the same
submission.
"""

from __future__ import annotations

import hashlib
import json
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import File
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Inquiry, PrivateFile
from .validation import inspect

#: The fields a fingerprint is taken over: what the visitor actually typed.
FINGERPRINTED = (
    "kind",
    "locale",
    "name",
    "email",
    "phone",
    "message",
    "send_to",
    "company_name",
    "city",
    "service_type",
    "is_aramco_vendor",
    "aramco_vendor_id",
)


class ConflictingReplay(Exception):
    """The same idempotency key arrived with different content."""

    def __init__(self, existing: Inquiry):
        super().__init__("That idempotency key was used for a different submission.")
        self.existing = existing


def fingerprint(data: dict, *, cv_checksum: str = "") -> str:
    """A stable digest of what was submitted.

    Sorted keys and a normalised shape, so two identical submissions produce
    the same digest regardless of dictionary order or missing optional keys.
    """
    payload = {field: data.get(field) for field in FINGERPRINTED}
    payload["cv"] = cv_checksum
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def store_cv(upload, *, original_name: str = "") -> PrivateFile:
    """Validate and store a CV. Raises ValidationError with a readable reason.

    The name handed to the storage backend is discarded by
    `hashed_private_path`; only its extension survives, and that came from the
    sniffed format rather than from the uploader.
    """
    probe = inspect(upload)

    private = PrivateFile(
        checksum=probe.checksum,
        original_name=(original_name or getattr(upload, "name", ""))[:255],
        content_type=probe.content_type,
        bytes=probe.bytes,
        expires_at=timezone.now() + timedelta(days=settings.WJEEN_CV_RETENTION_DAYS),
    )
    upload.seek(0)
    private.file.save(f"cv{probe.extension}", File(upload), save=False)
    private.save()
    return private


@transaction.atomic
def record(data: dict, *, cv=None, cv_name: str = "") -> tuple[Inquiry, bool]:
    """Store one submission. Returns (inquiry, created).

    Nothing extra is persisted for idempotency: when a replay arrives the
    fingerprint is recomputed from the stored row and compared. See `_matches`.
    """
    key = data["idempotency_key"]

    existing = Inquiry.objects.select_for_update().filter(idempotency_key=key).first()
    if existing is not None:
        if _matches(existing, data, cv=cv):
            return existing, False
        raise ConflictingReplay(existing)

    private = None
    if cv is not None:
        private = store_cv(cv, original_name=cv_name)

    inquiry = Inquiry(
        kind=data["kind"],
        locale=data.get("locale", "en"),
        name=data["name"],
        email=data["email"],
        phone=data["phone"],
        message=data.get("message", ""),
        send_to=data.get("send_to", ""),
        company_name=data.get("company_name", ""),
        city=data.get("city", ""),
        service_type=data.get("service_type", ""),
        is_aramco_vendor=bool(data.get("is_aramco_vendor", False)),
        aramco_vendor_id=data.get("aramco_vendor_id") or None,
        cv=private,
        idempotency_key=key,
        source_ip_hash=data.get("source_ip_hash", ""),
        user_agent=(data.get("user_agent") or "")[:300],
    )

    try:
        inquiry.save()
    except IntegrityError:
        # Two requests raced past the SELECT holding the same key. The loser
        # reads the winner's row rather than failing the visitor -- and still
        # refuses it if the content differs.
        winner = Inquiry.objects.filter(idempotency_key=key).first()
        if winner is None:
            raise
        if _matches(winner, data, cv=cv):
            return winner, False
        raise ConflictingReplay(winner) from None

    return inquiry, True


def _matches(existing: Inquiry, data: dict, *, cv=None) -> bool:
    """Whether a replay carries the same content as the stored row.

    A CV is compared by checksum, not by filename: the same document re-sent
    under a different name is the same submission. Reading the upload here
    costs one hash of a file already capped at a few megabytes.
    """
    stored = {field: getattr(existing, field) for field in FINGERPRINTED}
    # `aramco_vendor_id` is NULL in the row and may be absent or "" in the
    # payload; both mean the same thing.
    stored["aramco_vendor_id"] = stored["aramco_vendor_id"] or None
    incoming = dict(data)
    incoming["aramco_vendor_id"] = incoming.get("aramco_vendor_id") or None
    incoming["is_aramco_vendor"] = bool(incoming.get("is_aramco_vendor", False))

    stored_cv = existing.cv.checksum if existing.cv_id else ""
    if cv is None:
        incoming_cv = ""
    else:
        from .storage import checksum_of

        incoming_cv = checksum_of(cv)

    return fingerprint(stored, cv_checksum=stored_cv) == fingerprint(
        incoming, cv_checksum=incoming_cv
    )


def mark_notified(inquiry: Inquiry, *, error: str = "") -> None:
    """Record the outcome of the notification attempt.

    A failure is state, not a log line: `notified=False` with a reason is what
    the dashboard shows as a badge and what `retry_notifications` picks up.
    """
    inquiry.notify_attempts += 1
    if error:
        inquiry.notified = False
        inquiry.notify_error = error[:300]
    else:
        inquiry.notified = True
        inquiry.notify_error = ""
    inquiry.save(update_fields=["notified", "notify_attempts", "notify_error"])
