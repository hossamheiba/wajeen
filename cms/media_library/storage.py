"""Where the bytes go.

Files live on a filesystem, never in Postgres. A JSONB column holding base64
would be read on every content query, would break streaming and range requests,
and would put a 10MB blob through the same connection pool that serves text.

The path a file gets is derived from its own SHA-256, not from what the
uploader called it:

    media/library/a7/a7f3...c1.jpg

Three properties follow, and all three are load-bearing:

  - **A new image always gets a new URL.** Next.js caches optimised images by
    (url, width, quality), so replacing a file in place while keeping its name
    serves the old bytes until the cache expires -- the exact trap TODO-BACKEND
    warns about. Content-addressed names make that impossible.
  - **The same image uploaded twice lands on one file.** The checksum is also
    the deduplication key on MediaAsset.
  - **The uploader's filename never reaches the disk.** Directory traversal,
    control characters, NTFS alternate streams and case-collisions are all
    designed out rather than filtered. The original name is kept as metadata,
    for humans.

Storage itself is deliberately indirect: `settings.STORAGES["default"]` decides
where the bytes land, so moving to S3 or Cloudflare R2 later is a settings
change plus `django-storages`, not a change here or in any model.
"""

from __future__ import annotations

import hashlib
from pathlib import PurePosixPath

# Extension per accepted type. The file's *sniffed* format picks this, never
# the name the browser sent.
EXTENSION_FOR_FORMAT = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "WEBP": ".webp",
    "AVIF": ".avif",
}

CONTENT_TYPE_FOR_FORMAT = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "AVIF": "image/avif",
}


def checksum_of(handle) -> str:
    """SHA-256 of a file-like object, read in chunks and rewound afterwards."""
    digest = hashlib.sha256()
    handle.seek(0)
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
        digest.update(chunk)
    handle.seek(0)
    return digest.hexdigest()


def stored_path(checksum: str, extension: str) -> str:
    """`media/library/<2>/<full checksum><ext>` -- fanned out so no directory
    ends up with tens of thousands of entries."""
    return str(PurePosixPath("library", checksum[:2], f"{checksum}{extension}"))


def hashed_upload_path(instance, filename: str) -> str:
    """`upload_to` for MediaAsset.file.

    The instance already knows its checksum and extension by the time the file
    is saved -- both are computed during validation -- so `filename` is ignored
    on purpose.
    """
    extension = PurePosixPath(filename).suffix.lower() or ".bin"
    return stored_path(instance.checksum, extension)
