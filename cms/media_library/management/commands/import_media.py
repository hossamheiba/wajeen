"""Move the site's content-managed images into the library.

Only the images the *content* chooses are migrated. `projectsPage.items[n].image`,
`clients.items[n].logo` and `gallery.items[n].image` name a file; the component
turns that name into a path under /public. Those are the images an editor has
any business changing, so those are the ones that become rows here.

Everything a *component* chooses stays where it is: the brand marks, the
favicon, the four design textures, the page headers. They are imported at build
time by Next, carry blur placeholders, and belong to the design rather than to
the content -- see the audit in the task report.

Alternative text is taken from the content that already describes each image --
the project's title, the client's name, the gallery caption, in both languages.
Nothing is invented, and an image whose content gives no description is
imported with empty alt text and listed at the end so a person can write it.

Files under /public are read and never moved or deleted: until the website has
been verified against the library, they are still the fallback.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from media_library.models import MediaAsset, MediaBinding
from media_library.services import set_single, store_image

#: (namespace, list key, field naming the file, folder under public/images,
#:  role, asset category, field to describe it by)
SOURCES = [
    ("projectsPage", "items", "image", "projects", MediaBinding.Role.COVER,
     MediaAsset.Category.PROJECT, "title"),
    ("clients", "items", "logo", "clients", MediaBinding.Role.LOGO,
     MediaAsset.Category.CLIENT, "label"),
    # The Gallery section shows one photograph per item, so each item has a
    # cover of its own. The `gallery` *role* is for a set of images under one
    # address -- a project's photo set -- which is a different thing.
    ("gallery", "items", "image", "projects", MediaBinding.Role.COVER,
     MediaAsset.Category.GALLERY, "title"),
]


class Command(BaseCommand):
    help = "Import the content-managed images from public/images into the media library."

    def add_arguments(self, parser):
        parser.add_argument(
            "--public",
            default=None,
            help="Path to the site's public/ directory (default: repository public/).",
        )
        parser.add_argument(
            "--unbound",
            action="store_true",
            help=(
                "Also import files that sit in the project and client folders "
                "but that no content references, so they are available to pick "
                "from. They are stored with no binding, so nothing on the site "
                "changes."
            ),
        )
        parser.add_argument(
            "--dry-run", action="store_true", help="Report what would happen; write nothing."
        )

    def handle(self, *args, **options):
        public = Path(options["public"] or (settings.REPO_ROOT / "public"))
        images = public / "images"
        if not images.is_dir():
            raise CommandError(f"No image folder at {images}")

        messages = {}
        for locale in settings.CONTENT_LOCALES:
            path = Path(settings.MESSAGES_DIR) / f"{locale}.json"
            if not path.exists():
                raise CommandError(f"Missing messages file: {path}")
            messages[locale] = json.loads(path.read_text(encoding="utf-8"))

        primary, *others = list(settings.CONTENT_LOCALES)
        dry = options["dry_run"]

        stored: dict[str, MediaAsset] = {}
        bound = reused = skipped = 0
        missing: list[str] = []
        without_alt: list[str] = []

        with transaction.atomic():
            for namespace, list_key, field, folder, role, category, describe in SOURCES:
                rows = messages[primary].get(namespace, {}).get(list_key, [])
                for index, row in enumerate(rows):
                    name = row.get(field)
                    if not name:
                        continue

                    source = images / folder / f"{name}.jpg"
                    if not source.exists():
                        missing.append(f"{namespace}.{list_key}[{index}] -> {source}")
                        continue

                    alt = {primary: (row.get(describe) or "").strip()}
                    for other in others:
                        sibling = (
                            messages[other].get(namespace, {}).get(list_key, [])
                        )
                        alt[other] = (
                            (sibling[index].get(describe) or "").strip()
                            if index < len(sibling)
                            else ""
                        )

                    address = f"{namespace}.{list_key}[{index}]"
                    if not alt.get("en") and not alt.get("ar"):
                        without_alt.append(address)

                    if dry:
                        self.stdout.write(f"  would bind {address} -> {source.name}")
                        bound += 1
                        continue

                    key = str(source)
                    if key in stored:
                        asset = stored[key]
                        reused += 1
                    else:
                        with source.open("rb") as handle:
                            asset, created = store_image(
                                handle,
                                original_name=source.name,
                                alt_en=alt.get("en", ""),
                                alt_ar=alt.get("ar", ""),
                                category=category,
                            )
                        stored[key] = asset
                        if not created:
                            reused += 1

                    set_single(namespace, f"{list_key}[{index}]", role, asset)
                    bound += 1

            if options["unbound"] and not dry:
                for folder, category in (
                    ("projects", MediaAsset.Category.PROJECT),
                    ("clients", MediaAsset.Category.CLIENT),
                ):
                    for source in sorted((images / folder).glob("*.jpg")):
                        if str(source) in stored:
                            continue
                        with source.open("rb") as handle:
                            asset, created = store_image(
                                handle, original_name=source.name, category=category
                            )
                        stored[str(source)] = asset
                        if created:
                            skipped += 1

            if dry:
                transaction.set_rollback(True)

        if int(options.get("verbosity", 1)) < 1:
            return

        self.stdout.write(f"source        {images}")
        self.stdout.write(f"bindings      {bound}")
        self.stdout.write(f"assets        {len(stored)} distinct files")
        self.stdout.write(f"deduplicated  {reused} (same bytes already stored)")
        if options["unbound"]:
            self.stdout.write(f"unbound       {skipped} imported but shown nowhere")
        if missing:
            self.stdout.write(self.style.WARNING(f"missing       {len(missing)}"))
            for line in missing:
                self.stdout.write(f"              {line}")
        if without_alt:
            self.stdout.write(
                self.style.WARNING(
                    f"no alt text   {len(without_alt)} (the content describes no title)"
                )
            )
        self.stdout.write(
            self.style.SUCCESS("import complete; files under public/ were only read")
        )
