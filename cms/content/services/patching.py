"""
Deep, additive patching of a single namespace, with per-row optimistic
concurrency.

The canonical contract, exactly as approved:

    namespace  the root key -- "careersPage". Never contains a dot.
    locale     "en" | "ar"
    path       relative to that root -- "values", or "" for the root itself

so `careersPage.values` is patched as namespace="careersPage", path="values"
and lands at draft_data.values. The root is not a special case; it is just
path="". There is no PUT: a whole-document replace is the one operation that
can silently drop keys.
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction

from ..models import ContentBlock, validate_namespace
from .errors import ConcurrencyError, KeyLossError, UnknownBlockError
from .paths import deep_merge, get_at_path, key_paths, set_at_path


def split_namespace_path(dotted: str) -> tuple[str, str]:
    """"careersPage.values" -> ("careersPage", "values"); "hero" -> ("hero", "").

    Unambiguous because a namespace is always a single root key: every root in
    the registry is a real top-level key of messages/{locale}.json, and none of
    them contains a dot.
    """
    root, _, rest = dotted.partition(".")
    return root, rest


@transaction.atomic
def apply_patch(
    *,
    namespace: str,
    locale: str,
    patch: dict,
    expected_version: int,
    path: str = "",
    user=None,
) -> ContentBlock:
    """Merge `patch` into the draft at `path`, or raise.

    The draft is seeded from the *whole* namespace -- draft if one is already
    open, otherwise the published copy -- so a patch that touches one subtree
    can never drop the rest of the namespace. That is the merge invariant, and
    it is checked again on the way out.
    """
    try:
        validate_namespace(namespace)
    except ValidationError as exc:
        raise UnknownBlockError(str(exc.messages[0])) from exc

    if not isinstance(patch, dict):
        raise KeyLossError("A patch must be an object; scalars would replace the subtree.")

    block = (
        ContentBlock.objects.select_for_update()
        .filter(namespace=namespace, locale=locale)
        .first()
    )
    if block is None:
        raise UnknownBlockError(f"No content block for {namespace}[{locale}].")

    if int(expected_version) != block.version:
        raise ConcurrencyError(
            f"{namespace}[{locale}] is at version {block.version}, "
            f"but the edit was made against version {expected_version}."
        )

    base = block.effective_data
    before = set(key_paths(base))

    target = get_at_path(base, path)
    merged_target = deep_merge(target, patch)
    draft = set_at_path(base, path, merged_target)

    # Recursive, not top-level: comparing Object.keys() would happily miss a
    # whole subtree vanishing three levels down.
    lost = sorted(before - set(key_paths(draft)))
    if lost:
        raise KeyLossError(
            f"Patch would drop {len(lost)} key path(s) from {namespace}[{locale}]: "
            + ", ".join(lost[:10])
        )

    block.draft_data = draft
    block.version += 1
    if user is not None and getattr(user, "is_authenticated", False):
        block.updated_by = user
    block.save()
    return block


def discard_draft(*, namespace: str, locale: str, expected_version: int) -> ContentBlock:
    """Throw away a pending draft. Published content is not touched."""
    with transaction.atomic():
        block = (
            ContentBlock.objects.select_for_update()
            .filter(namespace=namespace, locale=locale)
            .first()
        )
        if block is None:
            raise UnknownBlockError(f"No content block for {namespace}[{locale}].")
        if int(expected_version) != block.version:
            raise ConcurrencyError(
                f"{namespace}[{locale}] is at version {block.version}."
            )
        block.draft_data = None
        block.version += 1
        block.save()
        return block
