"""
One table, recording failed sign-in attempts.

It lives in its own app rather than in `content` so the Stage 3B migration
chain stays byte-identical -- this is authentication infrastructure, not
content, and mixing the two would make "3B is unchanged" unprovable.

PostgreSQL is already a hard requirement, so counting rows costs no new
infrastructure and, unlike an in-process counter, holds across every worker.
"""

from django.db import models


class LoginAttempt(models.Model):
    """A failed sign-in, keyed by a hash of the client address.

    The address is hashed rather than stored: it is personal data, this table
    only ever needs equality, and a leaked copy should not be a log of who
    tried to sign in from where.

    Deliberately **not** keyed by username. Counting per username would let
    anyone lock a known account out at will, and would make the response differ
    for a real account -- which is exactly the disclosure the throttle is
    supposed to avoid.
    """

    key = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["key", "created_at"], name="idx_attempt_key_time"),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.key[:12]}… at {self.created_at:%Y-%m-%d %H:%M:%S}"
