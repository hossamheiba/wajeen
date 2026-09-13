"""What arrived through the website's forms.

One table, three kinds. Contact, vendor and career share a person's name, an
email and a phone number, and differ in a handful of fields each; three tables
would have meant three list screens, three endpoints and three sets of tests
for the same work.

The kind-specific fields are real columns, not a JSON blob. Two reasons, and
the second is the decisive one:

  - a column can be read at a glance, so "these fields and no others" is
    provable rather than asserted;
  - a `CHECK` constraint can enforce the rules the fields carry, and a JSON
    blob cannot. The Aramco rule in particular -- a vendor id exists if and
    only if the box was ticked -- is enforced by the database, so no endpoint,
    no admin action and no shell can store a placeholder in its place.

Nothing is ever deleted. A message is archived; history of who contacted the
company is not something a dashboard should be able to erase.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from . import vocab
from .storage import PrivateFileField, hashed_private_path


class PrivateFile(models.Model):
    """A stored document that nothing serves.

    Separate from `media_library.MediaAsset` on purpose: that model's files
    live under MEDIA_ROOT and are listed to every editor, which is right for a
    project photograph and wrong for someone's CV.

    `checksum` is indexed but **not unique**. Two applicants sending the same
    document are two applications, and deduplicating them would make one
    person's file disappear when the other's retention expired.
    """

    file = PrivateFileField(upload_to=hashed_private_path, max_length=255)
    checksum = models.CharField(max_length=64, db_index=True)
    original_name = models.CharField(max_length=255, blank=True, default="")
    content_type = models.CharField(max_length=128)
    bytes = models.PositiveIntegerField()

    created_at = models.DateTimeField(auto_now_add=True)
    #: When the retention period ends. Set on creation from
    #: WJEEN_CV_RETENTION_DAYS; `purge_expired_cvs` deletes the bytes after it.
    expires_at = models.DateTimeField(db_index=True)
    #: True once the bytes are gone. The row stays, so an application still
    #: records that a CV was attached and when it was removed.
    purged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.original_name or self.checksum[:12]} ({self.bytes} bytes)"

    @property
    def is_available(self) -> bool:
        return self.purged_at is None and bool(self.file)


class Inquiry(models.Model):
    """One submission from the public site."""

    class Kind(models.TextChoices):
        CONTACT = "contact", "Contact Wjeen"
        VENDOR = "vendor", "Service provider"
        CAREER = "career", "Career"

    class Status(models.TextChoices):
        NEW = "new", "New"
        READ = "read", "Read"
        REPLIED = "replied", "Replied"
        ARCHIVED = "archived", "Archived"

    kind = models.CharField(max_length=16, choices=Kind.choices)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.NEW, db_index=True
    )
    #: The language the visitor was reading, so a reply can be written in it.
    locale = models.CharField(max_length=5, default="en")

    # ---- shared by all three kinds ----
    #: A person's name. For a vendor this is the contact person; the company
    #: has its own column.
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=40)

    # ---- contact and vendor ----
    message = models.TextField(blank=True, default="")

    # ---- contact ----
    #: Who the message is addressed to, as a code from vocab.SEND_TO.
    send_to = models.CharField(
        max_length=40, choices=vocab.choices(vocab.SEND_TO), blank=True, default=""
    )

    # ---- vendor ----
    company_name = models.CharField(max_length=200, blank=True, default="")
    city = models.CharField(
        max_length=40, choices=vocab.choices(vocab.CITY), blank=True, default=""
    )
    service_type = models.CharField(
        max_length=40, choices=vocab.choices(vocab.SERVICE_TYPE), blank=True, default=""
    )
    is_aramco_vendor = models.BooleanField(default=False)
    #: NULL when the box is not ticked -- never "" and never a placeholder.
    #: The constraint below makes that structural.
    aramco_vendor_id = models.CharField(max_length=40, null=True, blank=True)

    # ---- career ----
    cv = models.OneToOneField(
        PrivateFile,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="inquiry",
    )

    # ---- operational ----
    #: The client's own key for this submission. Unique, so a retry after a
    #: timeout lands on the same row instead of creating a second enquiry.
    idempotency_key = models.UUIDField(unique=True)
    #: Whether the notification email went out. False is a visible state in
    #: the dashboard, not a swallowed log line.
    notified = models.BooleanField(default=False, db_index=True)
    notify_attempts = models.PositiveSmallIntegerField(default=0)
    notify_error = models.CharField(max_length=300, blank=True, default="")

    #: Hashed, never stored raw -- the same decision as throttling.LoginAttempt.
    #: It is personal data, and only ever needed for equality.
    source_ip_hash = models.CharField(max_length=64, blank=True, default="")
    user_agent = models.CharField(max_length=300, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="handled_inquiries",
    )

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["kind", "status", "-created_at"], name="idx_inq_board"),
            models.Index(fields=["email"], name="idx_inq_email"),
        ]
        constraints = [
            # The Aramco rule, in the database. ON requires an id; OFF forbids
            # one -- so "no dummy value" cannot be worked around.
            models.CheckConstraint(
                condition=(
                    models.Q(is_aramco_vendor=True, aramco_vendor_id__isnull=False)
                    | models.Q(is_aramco_vendor=False, aramco_vendor_id__isnull=True)
                ),
                name="inq_aramco_id_iff_aramco_vendor",
            ),
            # A vendor row without a company, a city and a service type is not
            # a vendor row.
            models.CheckConstraint(
                condition=(
                    ~models.Q(kind="vendor")
                    | (
                        ~models.Q(company_name="")
                        & ~models.Q(city="")
                        & ~models.Q(service_type="")
                    )
                ),
                name="inq_vendor_has_company_city_service",
            ),
            # A general enquiry has to say who it is for.
            models.CheckConstraint(
                condition=~models.Q(kind="contact") | ~models.Q(send_to=""),
                name="inq_contact_has_send_to",
            ),
            # An application without a CV is not an application.
            models.CheckConstraint(
                condition=~models.Q(kind="career") | models.Q(cv__isnull=False),
                name="inq_career_has_cv",
            ),
            # A career submission collects four fields and no message. Enforced
            # rather than merely expected, so the shape cannot drift.
            models.CheckConstraint(
                condition=~models.Q(kind="career") | models.Q(message=""),
                name="inq_career_has_no_message",
            ),
            # And nothing else may carry a CV.
            models.CheckConstraint(
                condition=models.Q(kind="career") | models.Q(cv__isnull=True),
                name="inq_only_career_has_cv",
            ),
        ]
        permissions = [
            # Reading a CV is a separate grant from reading the inbox, so a
            # content editor can triage messages without opening anybody's CV.
            ("view_cv", "Can download an applicant's CV"),
        ]

    def __str__(self) -> str:
        return f"{self.get_kind_display()} from {self.name} ({self.created_at:%Y-%m-%d})"

    def mark(self, status: str, *, user=None) -> None:
        """Move to a status, stamping the first time each one is reached.

        A timestamp records when something first happened, so it is set only
        when empty and never cleared -- reopening a replied message keeps the
        date it was replied to.
        """
        now = timezone.now()
        fields = ["status"]

        if status == self.Status.READ and self.read_at is None:
            self.read_at = now
            fields.append("read_at")
        if status == self.Status.REPLIED and self.replied_at is None:
            self.replied_at = now
            fields.append("replied_at")

        self.status = status
        if user is not None and getattr(user, "is_authenticated", False):
            self.handled_by = user
            fields.append("handled_by")

        self.save(update_fields=fields)

class CvAccessLog(models.Model):
    """Who downloaded which CV, and when.

    Personal data being read leaves a trace. There is no view for this table
    and no way to clear it from the dashboard; it exists to be able to answer
    the question afterwards.
    """

    inquiry = models.ForeignKey(
        Inquiry, on_delete=models.CASCADE, related_name="cv_accesses"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    at = models.DateTimeField(auto_now_add=True)
    ip_hash = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ["-at"]

    def __str__(self) -> str:
        who = self.user.username if self.user else "deleted user"
        return f"{who} downloaded CV for inquiry {self.inquiry_id} at {self.at:%Y-%m-%d %H:%M}"
