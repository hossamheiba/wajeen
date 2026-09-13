"""Images, and the places in the content that show them.

Two models, and the split between them is the whole design.

`MediaAsset` is a **file**: bytes, dimensions, a checksum, and the alternative
text that describes the picture itself. It knows nothing about the site.

`MediaBinding` is a **placement**: this asset, in this role, at this position,
at this address inside the content tree. It is a row, not a string in a JSON
blob, which is what makes three otherwise awkward questions trivial:

    where is this image used?      asset.bindings
    may I delete this image?       PROTECT answers it, in the database
    what order is the gallery in?  ORDER BY position

The address is `(namespace, path)` because that is what the content actually
is: ContentBlock rows holding the JSON tree of src/messages. `projectsPage`
plus `items[3]` names one project; there is no Project table to point a foreign
key at, and inventing one would fork the content model in two.

A role of `cover` or `logo` holds at most one asset -- enforced, not merely
expected. `gallery` holds as many as it likes, ordered by `position`.
"""

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models

from .storage import hashed_upload_path

# Same shape the content app uses: a namespace is a single root key of
# messages/{locale}.json.
validate_namespace = RegexValidator(
    r"^[A-Za-z][A-Za-z0-9]*$",
    message="A namespace is a single root key and must not contain a dot.",
)

# `items[3]`, `items[3].gallery`, or "" for the namespace itself. Bracketed
# indices only -- the same grammar content.services.paths speaks.
validate_content_path = RegexValidator(
    r"^$|^[A-Za-z][A-Za-z0-9]*(\[\d+\])*(\.[A-Za-z][A-Za-z0-9]*(\[\d+\])*)*$",
    message="A content path looks like `items[3]` or `items[3].photos`.",
)


class MediaAsset(models.Model):
    """One stored image file."""

    class Category(models.TextChoices):
        PROJECT = "project", "Project photo"
        CLIENT = "client", "Client logo"
        GALLERY = "gallery", "Gallery photo"
        PAGE = "page", "Page image"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    file = models.ImageField(upload_to=hashed_upload_path, max_length=255)

    # The deduplication key. Two uploads of the same bytes are one asset, and
    # the constraint is in the database rather than in a view that could be
    # bypassed by the next endpoint somebody adds.
    checksum = models.CharField(max_length=64, unique=True, db_index=True)

    original_name = models.CharField(max_length=255, blank=True, default="")
    content_type = models.CharField(max_length=64)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    bytes = models.PositiveIntegerField()

    # Alternative text is per-language because the site is. It describes the
    # *picture*, so it lives with the file; a caption describes the picture
    # *here*, so it lives on the binding.
    alt_en = models.CharField(max_length=300, blank=True, default="")
    alt_ar = models.CharField(max_length=300, blank=True, default="")

    category = models.CharField(
        max_length=16, choices=Category.choices, default=Category.OTHER
    )
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.ACTIVE
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="uploaded_media",
    )

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["category"], name="idx_asset_category"),
            models.Index(fields=["status"], name="idx_asset_status"),
        ]

    def __str__(self) -> str:
        return f"{self.original_name or self.checksum[:12]} ({self.width}x{self.height})"

    @property
    def in_use(self) -> bool:
        return self.bindings.exists()

    @property
    def usage_count(self) -> int:
        return self.bindings.count()


class MediaBinding(models.Model):
    """One asset shown at one address in the content, in one role."""

    class Role(models.TextChoices):
        COVER = "cover", "Cover"
        GALLERY = "gallery", "Gallery"
        LOGO = "logo", "Logo"

    #: Roles that may hold at most one asset at their address.
    SINGLE_ROLES = frozenset({Role.COVER, Role.LOGO})

    namespace = models.CharField(max_length=64, validators=[validate_namespace])
    path = models.CharField(
        max_length=200, blank=True, default="", validators=[validate_content_path]
    )
    role = models.CharField(max_length=16, choices=Role.choices)
    position = models.PositiveSmallIntegerField(default=0)

    # PROTECT is the delete guard. An asset that something shows cannot be
    # removed out from under it -- the database refuses, so no endpoint, no
    # admin action and no stray shell can leave the site with a broken image.
    asset = models.ForeignKey(
        MediaAsset, on_delete=models.PROTECT, related_name="bindings"
    )

    caption_en = models.CharField(max_length=300, blank=True, default="")
    caption_ar = models.CharField(max_length=300, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["namespace", "path", "role", "position", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["namespace", "path", "role", "position"],
                name="uniq_binding_slot",
            ),
            # A cover is a cover: one per address, guaranteed by a partial
            # unique index rather than by everybody remembering to check.
            models.UniqueConstraint(
                fields=["namespace", "path", "role"],
                condition=models.Q(role__in=["cover", "logo"]),
                name="uniq_single_valued_role",
            ),
        ]
        indexes = [
            models.Index(fields=["namespace", "path"], name="idx_binding_address"),
        ]

    def __str__(self) -> str:
        where = f"{self.namespace}.{self.path}" if self.path else self.namespace
        return f"{where} [{self.role}#{self.position}]"

    @property
    def address(self) -> str:
        return f"{self.namespace}.{self.path}" if self.path else self.namespace

    def clean(self):
        if self.role in self.SINGLE_ROLES and self.position != 0:
            raise ValidationError(
                {"position": f"A {self.role} is single-valued; its position is 0."}
            )
