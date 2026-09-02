"""
The hard gate.

    src/messages/{locale}.json  ->  import  ->  JSONB  ->  assemble  ->  tree

and the tree must be *semantically* identical to the file it came from. Not
similar. Not equal after normalising. Identical in every key path, every
nested object, every list length and order, every primitive type and every
value, in both locales.

Whitespace and key order are irrelevant by construction: the comparison runs
on parsed structures, never on JSON text.

Exit code 1 on any difference. Nothing may switch Next.js over to Django until
this command exits 0.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from content.services.assembler import DRAFT, PUBLISHED, assemble
from content.services.paths import key_paths, max_depth, structural_diff, type_name


class Command(BaseCommand):
    help = "Verify that imported content reassembles into the exact original messages."

    def add_arguments(self, parser):
        parser.add_argument("--source", default=None)
        parser.add_argument("--locales", default=None)
        parser.add_argument(
            "--kind",
            default=PUBLISHED,
            choices=[PUBLISHED, DRAFT],
            help="Which assembly to compare (default: published).",
        )
        parser.add_argument(
            "--max-report",
            type=int,
            default=25,
            help="How many differences to print before truncating.",
        )

    def handle(self, *args, **options):
        source = Path(options["source"] or settings.MESSAGES_DIR)
        locales = (
            [item.strip() for item in options["locales"].split(",") if item.strip()]
            if options["locales"]
            else list(settings.CONTENT_LOCALES)
        )

        rebuilt = assemble(options["kind"], locales)
        failures = 0

        for locale in locales:
            path = source / f"{locale}.json"
            if not path.exists():
                raise CommandError(f"Missing messages file: {path}")
            with path.open(encoding="utf-8") as handle:
                original = json.load(handle)

            actual = rebuilt.get(locale, {})
            expected_paths = set(key_paths(original))
            actual_paths = set(key_paths(actual))

            self.stdout.write("")
            self.stdout.write(f"[{locale}] {path}")
            self.stdout.write(
                f"  namespaces   {len(original)} expected / {len(actual)} rebuilt"
            )
            self.stdout.write(
                f"  key paths    {len(expected_paths)} expected / {len(actual_paths)} rebuilt"
            )
            self.stdout.write(
                f"  max depth    {max_depth(original)} expected / {max_depth(actual)} rebuilt"
            )
            self.stdout.write(f"  leaf types   {self._type_census(original)}")

            differences = structural_diff(original, actual)
            if differences:
                failures += 1
                self.stdout.write(self.style.ERROR(f"  FAIL {len(differences)} difference(s)"))
                for line in differences[: options["max_report"]]:
                    self.stdout.write(self.style.ERROR(f"    - {line}"))
                if len(differences) > options["max_report"]:
                    self.stdout.write(
                        self.style.ERROR(
                            f"    ... {len(differences) - options['max_report']} more"
                        )
                    )
            else:
                self.stdout.write(self.style.SUCCESS("  PASS exact semantic match"))

        self.stdout.write("")
        if failures:
            raise CommandError(
                f"ROUND-TRIP GATE FAILED for {failures} locale(s). "
                "Do not switch the Next.js content loader."
            )
        self.stdout.write(self.style.SUCCESS("ROUND-TRIP GATE PASSED"))

    def _type_census(self, tree) -> str:
        census: dict[str, int] = {}
        for path in key_paths(tree):
            node = tree
            for segment in path.replace("[", ".[").split("."):
                if not segment:
                    continue
                if segment.startswith("["):
                    node = node[int(segment[1:-1])]
                else:
                    node = node[segment]
            name = type_name(node)
            census[name] = census.get(name, 0) + 1
        return ", ".join(f"{key}={value}" for key, value in sorted(census.items()))
