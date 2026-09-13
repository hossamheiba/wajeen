"""Where a CV goes, and why it is nowhere near the media library.

A CV is personal data belonging to someone who applied for a job. It is not
site content, it is never shown on a page, and it must not be reachable by
anyone holding a URL. `media_library` is the opposite of all three: its files
live under MEDIA_ROOT, which a web server or a CDN serves directly, and every
asset is listed to any signed-in editor. Reusing it would have made a CV a
public object with a hard-to-guess name, which is not the same thing as a
private one.

So private files get their own root, their own storage instance, and no URL at
all:

    WJEEN_PRIVATE_ROOT/cv/<2>/<sha256>.pdf

Three properties, and all three are deliberate:

  - **Nothing serves it.** The root is outside MEDIA_ROOT and is never added
    to `urlpatterns`. `PrivateFileSystemStorage.url()` raises rather than
    returning a path, so a template or a serializer that tries to expose one
    fails loudly at development time instead of quietly in production.
  - **The uploader's filename never touches the disk.** The stored name is the
    SHA-256 of the bytes plus an extension chosen from the *sniffed* format.
    Traversal, control characters and case collisions are designed out.
  - **Swapping to private object storage is a settings change.** The field
    resolves its storage from `WJEEN_PRIVATE_STORAGE` on every access and
    keeps it out of the migration, so S3 with a private ACL (or R2, or a
    mounted volume) replaces the local disk without touching the Inquiry
    model, the API, the download view, or `0001_initial` -- which is the
    requirement: local for development and tests, swappable for production.

Note the asymmetry with `media_library.storage`, which *wants* a URL because
the website renders those files. Here a URL is the bug.
"""

from __future__ import annotations

import hashlib
from pathlib import PurePosixPath

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import FileSystemStorage
from django.db import models
from django.utils.module_loading import import_string

#: Extension per accepted document format. The sniffed format picks this, never
#: the name the browser sent.
EXTENSION_FOR_FORMAT = {
    "PDF": ".pdf",
    "DOCX": ".docx",
}

CONTENT_TYPE_FOR_FORMAT = {
    "PDF": "application/pdf",
    "DOCX": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class PrivateFileSystemStorage(FileSystemStorage):
    """Local disk, with `url()` removed on purpose.

    `FileSystemStorage.url()` would happily build `/media/...` from
    `base_url`. For a CV that would be a public link, so asking for one is
    treated as a programming error rather than answered.
    """

    def url(self, name):  # noqa: D102 - the docstring above is the contract
        raise ImproperlyConfigured(
            "Private files have no public URL. Serve them through the "
            "authenticated download view instead."
        )


_cache: dict[tuple[str, str | None], FileSystemStorage] = {}


def private_storage():
    """The storage instance every private file uses.

    Reads `WJEEN_PRIVATE_STORAGE`; the default is the local-disk class above.
    Naming a production backend there is the only change needed to move CVs
    into private object storage.

    Resolved per access rather than once at import, and cached on the settings
    it was built from -- so `override_settings` in a test is honoured instead
    of being served a stale instance built from the real configuration.
    """
    root = str(getattr(settings, "WJEEN_PRIVATE_ROOT", ""))
    dotted = getattr(settings, "WJEEN_PRIVATE_STORAGE", None)
    key = (root, dotted)
    if key not in _cache:
        if dotted:
            options = getattr(settings, "WJEEN_PRIVATE_STORAGE_OPTIONS", {})
            _cache[key] = import_string(dotted)(**options)
        else:
            _cache[key] = PrivateFileSystemStorage(location=root)
    return _cache[key]


class PrivateFileField(models.FileField):
    """A FileField whose storage follows the settings, and never migrates.

    Two problems this solves, both of which bit the obvious approaches:

      - `FileField(storage=<instance>)` freezes one storage in the field, and
        `deconstruct()` writes it into the migration -- so changing where
        private files live would need a migration, and a test overriding the
        root would still write to the real one.
      - `FileField(storage=<callable>)` is evaluated once when the class is
        defined, which has the same effect.

    Resolving `storage` as a property fixes both, and dropping it from
    `deconstruct()` keeps `0001_initial` free of any path or backend name.
    """

    def __init__(self, *args, **kwargs):
        kwargs.pop("storage", None)
        super().__init__(*args, **kwargs)

    @property
    def storage(self):
        return private_storage()

    @storage.setter
    def storage(self, value):
        # FileField.__init__ assigns default_storage here; the property above
        # is the only answer, so the assignment is deliberately dropped.
        pass

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs.pop("storage", None)
        return name, path, args, kwargs


def checksum_of(handle) -> str:
    """SHA-256 of a file-like object, read in chunks and rewound afterwards."""
    digest = hashlib.sha256()
    handle.seek(0)
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
        digest.update(chunk)
    handle.seek(0)
    return digest.hexdigest()


def stored_path(checksum: str, extension: str) -> str:
    """`cv/<2>/<full checksum><ext>` -- fanned out so no directory grows huge."""
    return str(PurePosixPath("cv", checksum[:2], f"{checksum}{extension}"))


def hashed_private_path(instance, filename: str) -> str:
    """`upload_to` for PrivateFile.file.

    The instance already knows its checksum by the time the file is saved, so
    `filename` contributes only its extension -- and that came from the
    sniffed format, not from the uploader.
    """
    extension = PurePosixPath(filename).suffix.lower() or ".bin"
    return stored_path(instance.checksum, extension)
