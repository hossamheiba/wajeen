"""
Publish and rollback.

Both produce a new immutable ContentVersion. Neither ever edits an existing
one: rolling back to v3 does not resurrect v3, it appends v9 carrying v3's
content. History only ever grows forward, so rolling back a rollback is just
another rollback.

Every snapshot is complete -- both locales, every namespace -- even when only
one namespace had a draft. A partial snapshot could not be restored on its own,
which would make the whole revision log a lie.
"""

from __future__ import annotations

from django.db import transaction

from ..models import ContentBlock, ContentVersion
from .assembler import PUBLISHED, assemble
from .errors import (
    ConcurrencyError,
    NothingToPublishError,
    UnknownVersionError,
)
from .paths import key_paths


def current_version() -> ContentVersion | None:
    return ContentVersion.objects.filter(is_current=True).first()


def _lock_current() -> ContentVersion | None:
    """Take the global publish lock.

    Locking the current revision row serialises publish and rollback against
    each other. Per-namespace edits take no part in this -- they lock their own
    row and nothing else.
    """
    return ContentVersion.objects.select_for_update().filter(is_current=True).first()


def _check_if_match(current: ContentVersion | None, if_match: int | None) -> None:
    """If-Match on publish/rollback is the *global* revision, never a block version."""
    if if_match is None:
        return
    expected = current.number if current is not None else 0
    if int(if_match) != expected:
        raise ConcurrencyError(
            f"Published content is at revision {expected}, "
            f"but the request was made against revision {if_match}."
        )


def _next_number() -> int:
    latest = ContentVersion.objects.order_by("-number").first()
    return (latest.number + 1) if latest else 1


def _assert_locale_parity(snapshot: dict) -> None:
    """A published revision with drifted locales would break the site in one language."""
    locales = list(snapshot)
    if len(locales) < 2:
        return
    reference = locales[0]
    reference_paths = set(key_paths(snapshot[reference]))
    for locale in locales[1:]:
        other = set(key_paths(snapshot[locale]))
        if other != reference_paths:
            missing = sorted(reference_paths - other)[:10]
            extra = sorted(other - reference_paths)[:10]
            raise ConcurrencyError(
                f"Refusing to publish: {locale} has drifted from {reference}. "
                f"Missing: {missing}. Extra: {extra}."
            )


def _append_version(*, snapshot, source, label, user, rolled_back_from=None) -> ContentVersion:
    """Clear the old current flag, then append. Order matters.

    The partial unique index is checked immediately, so inserting the new
    current revision before clearing the old one would be rejected by the
    database -- which is the point.
    """
    ContentVersion.objects.filter(is_current=True).update(is_current=False)
    return ContentVersion.objects.create(
        number=_next_number(),
        label=label or "",
        snapshot=snapshot,
        is_current=True,
        source=source,
        rolled_back_from=rolled_back_from,
        created_by=user if user is not None and getattr(user, "is_authenticated", False) else None,
    )


def create_baseline_version(*, label: str = "", user=None) -> ContentVersion:
    """The first revision, taken straight from imported published content."""
    snapshot = assemble(PUBLISHED)
    _assert_locale_parity(snapshot)
    return _append_version(
        snapshot=snapshot, source=ContentVersion.Source.PUBLISH, label=label, user=user
    )


@transaction.atomic
def publish(*, user=None, label: str = "", if_match: int | None = None) -> ContentVersion:
    """Promote every pending draft and append a complete revision."""
    current = _lock_current()
    _check_if_match(current, if_match)

    blocks = list(ContentBlock.objects.select_for_update().order_by("namespace", "locale"))
    pending = [block for block in blocks if block.draft_data is not None]
    if not pending:
        raise NothingToPublishError("There are no pending drafts to publish.")

    for block in pending:
        block.published_data = block.draft_data
        # Cleared on success so the same draft can never be published twice;
        # a NULL draft is also how the next publish knows this namespace is
        # unchanged.
        block.draft_data = None
        block.version += 1
        if user is not None and getattr(user, "is_authenticated", False):
            block.updated_by = user
        block.save()

    # Assembled *after* the promotion, so unchanged namespaces contribute their
    # existing published_data and the snapshot is whole.
    snapshot = assemble(PUBLISHED)
    _assert_locale_parity(snapshot)

    return _append_version(
        snapshot=snapshot,
        source=ContentVersion.Source.PUBLISH,
        label=label,
        user=user,
    )


@transaction.atomic
def rollback(*, target_number: int, user=None, label: str = "", if_match: int | None = None):
    """Restore a past revision's content by appending a new one.

    Pending drafts are deliberately left alone: a draft is unpublished work,
    and rolling back the published site should not throw it away.
    """
    current = _lock_current()
    _check_if_match(current, if_match)

    target = ContentVersion.objects.filter(number=target_number).first()
    if target is None:
        raise UnknownVersionError(f"No published revision numbered {target_number}.")

    blocks = {
        (block.locale, block.namespace): block
        for block in ContentBlock.objects.select_for_update()
    }

    for locale, namespaces in target.snapshot.items():
        for namespace, data in namespaces.items():
            block = blocks.get((locale, namespace))
            if block is None:
                block = ContentBlock(namespace=namespace, locale=locale)
            block.published_data = data
            block.version += 1
            block.save()

    # Namespaces created after `target` keep their current published content --
    # nothing is deleted -- so the new snapshot is assembled from reality
    # rather than copied blindly, and stays complete either way.
    snapshot = assemble(PUBLISHED)
    _assert_locale_parity(snapshot)

    return _append_version(
        snapshot=snapshot,
        source=ContentVersion.Source.ROLLBACK,
        label=label or f"Rollback to v{target.number}",
        user=user,
        rolled_back_from=target,
    )
