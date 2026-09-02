"""
Sign-in throttling for the admin login endpoint, and nothing else.

Scope is deliberately narrow: authenticated Studio traffic is never counted,
because a session that already exists has nothing to brute force and an editor
saving drafts quickly is normal use, not an attack.

Failure mode is **open**. If the database cannot be reached the throttle allows
the request through -- authentication needs that same database, so a closed
failure would turn a brief outage into a lockout without buying any security.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.db import DatabaseError
from django.utils import timezone

from .models import LoginAttempt


@dataclass(frozen=True)
class Verdict:
    allowed: bool
    #: Seconds until the oldest counted attempt leaves the window.
    retry_after: int = 0


def client_key(request) -> str:
    """A hash of the best available client address.

    `REMOTE_ADDR` by default, because a client cannot forge the peer address of
    its own TCP connection. `X-Forwarded-For` is consulted only when the
    deployment says a trusted proxy sets it, and then the **rightmost** entry
    is used: everything to its left was supplied by the caller and can say
    whatever it likes, while the rightmost is what our own proxy observed.
    """
    address = request.META.get("REMOTE_ADDR", "") or "unknown"

    if getattr(settings, "TRUST_PROXY_HEADER", False):
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        parts = [part.strip() for part in forwarded.split(",") if part.strip()]
        if parts:
            address = parts[-1]

    return hashlib.sha256(f"login:{address}".encode()).hexdigest()


def _window_start():
    return timezone.now() - timedelta(seconds=settings.LOGIN_THROTTLE_WINDOW)


def check(key: str) -> Verdict:
    """Is this client still allowed to try?"""
    try:
        since = _window_start()
        attempts = list(
            LoginAttempt.objects.filter(key=key, created_at__gte=since)
            .order_by("created_at")
            .values_list("created_at", flat=True)[: settings.LOGIN_THROTTLE_LIMIT]
        )
        if len(attempts) < settings.LOGIN_THROTTLE_LIMIT:
            return Verdict(allowed=True)

        # The window frees up when its oldest counted attempt ages out.
        frees_at = attempts[0] + timedelta(seconds=settings.LOGIN_THROTTLE_WINDOW)
        remaining = int((frees_at - timezone.now()).total_seconds())
        return Verdict(allowed=False, retry_after=max(1, remaining))
    except DatabaseError:
        return Verdict(allowed=True)


def record_failure(key: str) -> None:
    """Count one failed attempt, and opportunistically drop stale rows."""
    try:
        LoginAttempt.objects.create(key=key)
        # Cheap amortised cleanup so the table cannot grow without bound.
        if LoginAttempt.objects.count() > settings.LOGIN_THROTTLE_SWEEP_AT:
            LoginAttempt.objects.filter(created_at__lt=_window_start()).delete()
    except DatabaseError:
        pass


def clear(key: str) -> None:
    """A successful sign-in forgives this client's earlier failures."""
    try:
        LoginAttempt.objects.filter(key=key).delete()
    except DatabaseError:
        pass
