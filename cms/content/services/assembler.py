"""
Turns rows back into the shape next-intl expects.

The assembler is the inverse of the importer, and the round-trip gate is
simply importer -> assembler compared against the file it started from.
"""

from __future__ import annotations

from django.conf import settings

from ..models import ContentBlock

PUBLISHED = "published"
DRAFT = "draft"


def assemble(kind: str = PUBLISHED, locales: list[str] | None = None) -> dict:
    """Build {locale: {namespace: data}} straight out of the database.

    `published` is what the site would serve. `draft` is what an editor sees:
    the pending edit where one exists, the published copy everywhere else --
    so a preview is never a half-empty page.
    """
    if kind not in (PUBLISHED, DRAFT):
        raise ValueError(f"Unknown assembly kind: {kind!r}")

    wanted = locales or list(settings.CONTENT_LOCALES)
    tree: dict[str, dict] = {locale: {} for locale in wanted}

    for block in ContentBlock.objects.filter(locale__in=wanted).order_by("namespace"):
        data = block.published_data if kind == PUBLISHED else block.effective_data
        tree[block.locale][block.namespace] = data

    return tree


def assemble_locale(locale: str, kind: str = PUBLISHED) -> dict:
    """One locale's messages, in the exact shape of src/messages/{locale}.json."""
    return assemble(kind, [locale])[locale]
