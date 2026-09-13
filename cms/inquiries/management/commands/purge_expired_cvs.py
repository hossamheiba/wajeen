"""Delete CV bytes whose retention period has ended.

The row survives. An application still records that a CV was attached and when
it was removed -- what goes is the document itself, because keeping someone's
CV indefinitely is not something a default should decide.

Retention is `WJEEN_CV_RETENTION_DAYS` (365). Each file carries its own
`expires_at`, stamped when it was stored, so changing the setting does not
retroactively move the deadline for files already held.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from inquiries.models import PrivateFile


class Command(BaseCommand):
    help = "Delete the bytes of CVs past their retention period."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true", help="Report what would go; delete nothing."
        )

    def handle(self, *args, **options):
        due = PrivateFile.objects.filter(
            expires_at__lte=timezone.now(), purged_at__isnull=True
        )
        dry = options["dry_run"]
        purged = 0

        for private in due:
            if dry:
                self.stdout.write(f"  would purge #{private.pk} {private.original_name}")
                purged += 1
                continue

            stored = private.file.name
            if stored:
                # Storage first, then the flag: a crash between the two leaves
                # a row still marked available, which the next run retries --
                # the opposite order would lose track of a file that is still
                # on disk.
                private.file.storage.delete(stored)
            private.file = ""
            private.purged_at = timezone.now()
            private.save(update_fields=["file", "purged_at"])
            purged += 1

        if int(options.get("verbosity", 1)) < 1:
            return
        self.stdout.write(f"due     {due.count() if dry else purged}")
        self.stdout.write(
            self.style.SUCCESS(
                f"{'would purge' if dry else 'purged'} {purged} file(s); rows kept"
            )
        )
