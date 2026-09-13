"""
Load src/messages/{locale}.json into ContentBlock rows.

The repository JSON is opened read-only and is never written, moved or
rewritten by this command -- it is still the production source of truth.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from content.models import ContentBlock, ContentVersion
from content.services.paths import key_paths


class Command(BaseCommand):
    help = "Import repository messages JSON into content blocks (read-only on the files)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            default=None,
            help="Directory holding {locale}.json (default: settings.MESSAGES_DIR).",
        )
        parser.add_argument(
            "--locales",
            default=None,
            help="Comma-separated locales (default: settings.CONTENT_LOCALES).",
        )
        parser.add_argument(
            "--drop-drafts",
            action="store_true",
            help="Also clear pending drafts on re-import.",
        )
        parser.add_argument(
            "--no-version",
            action="store_true",
            help="Import blocks without creating the baseline published revision.",
        )
        parser.add_argument(
            "--republish",
            action="store_true",
            help=(
                "After importing, append a revision recording the re-imported "
                "content. Without this the current revision keeps whatever it "
                "held before the import, which for a re-import means the "
                "history and the live rows disagree."
            ),
        )

    def handle(self, *args, **options):
        source = Path(options["source"] or settings.MESSAGES_DIR)
        locales = (
            [item.strip() for item in options["locales"].split(",") if item.strip()]
            if options["locales"]
            else list(settings.CONTENT_LOCALES)
        )

        payloads: dict[str, dict] = {}
        for locale in locales:
            path = source / f"{locale}.json"
            if not path.exists():
                raise CommandError(f"Missing messages file: {path}")
            with path.open(encoding="utf-8") as handle:
                payloads[locale] = json.load(handle)

        self._check_parity(payloads)

        created = updated = unchanged = 0
        with transaction.atomic():
            for locale, namespaces in payloads.items():
                for namespace, data in namespaces.items():
                    block = ContentBlock.objects.filter(
                        namespace=namespace, locale=locale
                    ).first()
                    if block is None:
                        ContentBlock.objects.create(
                            namespace=namespace,
                            locale=locale,
                            published_data=data,
                            draft_data=None,
                        )
                        created += 1
                        continue

                    dirty = False
                    if block.published_data != data:
                        block.published_data = data
                        block.version += 1
                        dirty = True
                    if options["drop_drafts"] and block.draft_data is not None:
                        block.draft_data = None
                        dirty = True

                    if dirty:
                        block.save()
                        updated += 1
                    else:
                        unchanged += 1

            baseline = revision = None
            if not options["no_version"]:
                from content.services.publishing import (
                    create_baseline_version,
                    snapshot_published,
                )

                if not ContentVersion.objects.exists():
                    baseline = create_baseline_version(
                        label="Imported from repository JSON"
                    )
                elif options["republish"] and (created or updated):
                    # Published history is immutable, so a stale revision is
                    # superseded rather than rewritten: the new one becomes
                    # current and carries the re-imported content.
                    revision = snapshot_published(
                        label="Re-imported from repository JSON"
                    )

        total_paths = {locale: len(list(key_paths(tree))) for locale, tree in payloads.items()}

        if int(options.get("verbosity", 1)) < 1:
            return

        self.stdout.write(f"source        {source}")
        self.stdout.write(f"locales       {', '.join(locales)}")
        self.stdout.write(f"namespaces    {len(payloads[locales[0]])} per locale")
        self.stdout.write(f"key paths     {total_paths}")
        self.stdout.write(f"blocks        created={created} updated={updated} unchanged={unchanged}")
        if baseline is not None:
            self.stdout.write(f"baseline      revision v{baseline.number} (current)")
        if revision is not None:
            self.stdout.write(f"republished   revision v{revision.number} (current)")
        self.stdout.write(self.style.SUCCESS("import complete; repository files untouched"))

    def _check_parity(self, payloads: dict[str, dict]) -> None:
        """Refuse to import content whose locales have drifted apart."""
        locales = list(payloads)
        reference = locales[0]
        reference_paths = set(key_paths(payloads[reference]))
        for locale in locales[1:]:
            other = set(key_paths(payloads[locale]))
            if other != reference_paths:
                missing = sorted(reference_paths - other)[:10]
                extra = sorted(other - reference_paths)[:10]
                raise CommandError(
                    f"Key parity broken between {reference} and {locale}. "
                    f"Missing in {locale}: {missing}. Extra in {locale}: {extra}."
                )
