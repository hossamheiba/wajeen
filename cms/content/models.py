"""
Two version concepts live here, and they are deliberately never mixed.

ContentBlock.version   -- a per-row counter for optimistic concurrency. Scoped
                          to one (namespace, locale). Bumped by every PATCH.
ContentVersion         -- an immutable, global, both-locales snapshot created
                          by publish and by rollback. This is the thing users
                          mean by "revision".

Editing `hero` and `clients` at the same time never conflicts: different rows,
different counters. The only global contention point is publish.
"""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models

# A namespace is a *root* key of messages/{locale}.json. It never contains a
# dot: "careersPage.values" is namespace "careersPage" plus path "values".
NAMESPACE_RE = r"^[A-Za-z][A-Za-z0-9]*$"

validate_namespace = RegexValidator(
    NAMESPACE_RE,
    message="A namespace is a single root key and must not contain a dot.",
)


class ImmutableVersionError(Exception):
    """Raised when something tries to rewrite published history."""


class ContentBlock(models.Model):
    """One namespace in one locale.

    `published_data` is what the site would serve. `draft_data` is the pending
    edit, or NULL when there is nothing pending -- which is also how publish
    knows which namespaces changed.
    """

    namespace = models.CharField(max_length=64, validators=[validate_namespace])
    locale = models.CharField(max_length=8)

    published_data = models.JSONField(default=dict)
    draft_data = models.JSONField(null=True, blank=True, default=None)

    # Optimistic concurrency for this row only. Never the publish revision.
    version = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="edited_blocks",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["namespace", "locale"], name="uniq_block_namespace_locale"
            ),
        ]
        indexes = [models.Index(fields=["locale"], name="idx_block_locale")]
        ordering = ["namespace", "locale"]

    def __str__(self) -> str:
        return f"{self.namespace}[{self.locale}] v{self.version}"

    @property
    def has_draft(self) -> bool:
        return self.draft_data is not None

    @property
    def effective_data(self) -> dict:
        """What an editor sees: the draft if one exists, else what is published."""
        return self.draft_data if self.draft_data is not None else self.published_data


class ContentVersion(models.Model):
    """An immutable published revision covering every namespace in every locale.

    `snapshot` is always complete:
        {"en": {...28 namespaces...}, "ar": {...28 namespaces...}}
    never a delta, never one locale. Rollback has to be a single restore.
    """

    class Source(models.TextChoices):
        PUBLISH = "publish", "publish"
        ROLLBACK = "rollback", "rollback"

    number = models.PositiveIntegerField(unique=True)
    label = models.CharField(max_length=200, blank=True, default="")
    snapshot = models.JSONField()
    is_current = models.BooleanField(default=False)
    source = models.CharField(max_length=16, choices=Source.choices, default=Source.PUBLISH)
    rolled_back_from = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="rollbacks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="published_versions",
    )

    # Fields that may still change after the row exists. Everything else is
    # frozen -- enforced here and again by a database trigger.
    MUTABLE_AFTER_CREATE = frozenset({"is_current"})

    class Meta:
        constraints = [
            # The database, not the application, guarantees there is at most
            # one current revision. A partial unique index on a boolean means
            # a second `is_current = true` row simply cannot be inserted.
            models.UniqueConstraint(
                fields=["is_current"],
                condition=models.Q(is_current=True),
                name="uniq_single_current_version",
            ),
        ]
        ordering = ["-number"]

    def __str__(self) -> str:
        mark = " (current)" if self.is_current else ""
        return f"v{self.number} [{self.source}]{mark}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            stored = ContentVersion.objects.filter(pk=self.pk).first()
            if stored is not None:
                changed = {
                    field.attname
                    for field in self._meta.concrete_fields
                    if getattr(self, field.attname) != getattr(stored, field.attname)
                }
                frozen = changed - self.MUTABLE_AFTER_CREATE
                if frozen:
                    raise ImmutableVersionError(
                        "Published history is immutable; refused to change "
                        + ", ".join(sorted(frozen))
                    )
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ImmutableVersionError("Published revisions are never deleted.")

    def clean(self):
        if self.source == self.Source.ROLLBACK and self.rolled_back_from_id is None:
            raise ValidationError("A rollback revision must record its source revision.")
