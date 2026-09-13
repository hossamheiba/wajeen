"""Rate limiting for the public submission endpoint.

The site already has a limiter in `src/lib/rateLimit.ts`, and its own comment
explains why it is not enough: the counters live in one Node process, so a
serverless or multi-instance host enforces the limit per instance. This one
counts rows in Postgres, which every worker shares, and is the reason the same
request is limited twice rather than once.

Written against the same idea as `throttling.limiter` -- a hashed key and a
fixed window -- but with its own table, because failed sign-ins and public
submissions have nothing to do with each other and sharing a table would make
either one's retention policy the other's problem.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import Inquiry

#: A generous window. Visitors behind one corporate gateway share an address,
#: so a tight limit would turn away a whole office; the goal is to stop a
#: flood, not to police ordinary use.
WINDOW = timedelta(minutes=10)
LIMIT = 10


def hash_address(address: str) -> str:
    """The stored form of a client address.

    Hashed with the secret key as a salt: the value is personal data, only
    equality is ever needed, and a leaked copy should not be a log of who
    contacted the company from where.
    """
    if not address:
        return ""
    salted = f"{settings.SECRET_KEY}:{address}".encode("utf-8")
    return hashlib.sha256(salted).hexdigest()


@dataclass(frozen=True)
class Verdict:
    ok: bool
    retry_after: int = 0


def check(ip_hash: str) -> Verdict:
    """Whether another submission from this address is allowed.

    Counts the submissions already stored in the window rather than keeping a
    separate counter table: the rows are the record, and a limiter that can
    disagree with them would be a second source of truth.
    """
    if not ip_hash:
        return Verdict(ok=True)

    since = timezone.now() - WINDOW
    recent = Inquiry.objects.filter(source_ip_hash=ip_hash, created_at__gte=since)
    if recent.count() < LIMIT:
        return Verdict(ok=True)

    oldest = recent.order_by("created_at").first()
    resets_at = oldest.created_at + WINDOW
    return Verdict(
        ok=False,
        retry_after=max(1, int((resets_at - timezone.now()).total_seconds())),
    )
