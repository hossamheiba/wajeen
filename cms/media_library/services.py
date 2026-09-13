"""The operations the API and the commands both need.

Kept out of the views so that a management command, a test and an HTTP request
all take the same path -- the import command in particular must not be a second
implementation of "store an image".
"""

from __future__ import annotations

from django.core.files.base import File
from django.db import transaction

from .models import MediaAsset, MediaBinding
from .storage import stored_path
from .validation import inspect


class DuplicateAsset(Exception):
    """Raised with the asset that already holds these exact bytes."""

    def __init__(self, existing: MediaAsset):
        super().__init__(f"Already stored as asset {existing.pk}.")
        self.existing = existing


@transaction.atomic
def store_image(
    upload,
    *,
    original_name: str = "",
    alt_en: str = "",
    alt_ar: str = "",
    category: str = MediaAsset.Category.OTHER,
    user=None,
    on_duplicate: str = "reuse",
) -> tuple[MediaAsset, bool]:
    """Validate, deduplicate, and store. Returns (asset, created).

    Deduplication is on the SHA-256 of the bytes, so the same photograph
    uploaded from two machines under two names is one file on disk and one row
    here. `on_duplicate="reject"` turns that into an error instead, for the
    upload endpoint, where a person deserves to be told rather than quietly
    handed somebody else's row.
    """
    probe = inspect(upload)

    existing = MediaAsset.objects.filter(checksum=probe.checksum).first()
    if existing is not None:
        if on_duplicate == "reject":
            raise DuplicateAsset(existing)
        # Alt text arriving with a second upload is an improvement, not a
        # conflict -- but never blank out what is already there.
        changed = []
        for field, value in (("alt_en", alt_en), ("alt_ar", alt_ar)):
            if value and not getattr(existing, field):
                setattr(existing, field, value)
                changed.append(field)
        if changed:
            existing.save(update_fields=[*changed, "updated_at"])
        return existing, False

    asset = MediaAsset(
        checksum=probe.checksum,
        original_name=(original_name or getattr(upload, "name", ""))[:255],
        content_type=probe.content_type,
        width=probe.width,
        height=probe.height,
        bytes=probe.bytes,
        alt_en=alt_en,
        alt_ar=alt_ar,
        category=category,
        created_by=user if user is not None and getattr(user, "is_authenticated", False) else None,
    )
    # The name handed to the storage backend is thrown away by
    # `hashed_upload_path`; only its extension survives, and that comes from
    # the sniffed format rather than from the uploader.
    target = stored_path(probe.checksum, probe.extension)
    if asset.file.storage.exists(target):
        # The bytes are already on disk under their own hash. Django would
        # otherwise append a random suffix to avoid the "collision" -- which
        # for a content-addressed name is not a collision at all, and would
        # leave two identical files and two different URLs for one image.
        # (It happens whenever two databases share a MEDIA_ROOT, which
        # development and the end-to-end fixture do.)
        asset.file.name = target
    else:
        upload.seek(0)
        asset.file.save(f"upload{probe.extension}", File(upload), save=False)
    asset.save()
    return asset, True


@transaction.atomic
def set_single(namespace: str, path: str, role: str, asset: MediaAsset | None, **fields):
    """Point a single-valued role (a cover, a logo) at an asset, or clear it."""
    MediaBinding.objects.filter(namespace=namespace, path=path, role=role).delete()
    if asset is None:
        return None
    return MediaBinding.objects.create(
        namespace=namespace, path=path, role=role, position=0, asset=asset, **fields
    )


@transaction.atomic
def set_gallery(namespace: str, path: str, entries: list[dict]) -> list[MediaBinding]:
    """Replace a gallery with `entries`, in the order given.

    Written as replace-the-whole-list rather than move-one-item because the
    unique constraint on (address, role, position) makes a partial reorder a
    dance of temporary positions, and because the dashboard sends the finished
    order anyway. The old rows go first, inside the transaction, so the
    constraint never sees two rows claiming position 2.
    """
    MediaBinding.objects.filter(
        namespace=namespace, path=path, role=MediaBinding.Role.GALLERY
    ).delete()
    created = []
    for position, entry in enumerate(entries):
        created.append(
            MediaBinding.objects.create(
                namespace=namespace,
                path=path,
                role=MediaBinding.Role.GALLERY,
                position=position,
                asset=entry["asset"],
                caption_en=entry.get("caption_en", ""),
                caption_ar=entry.get("caption_ar", ""),
            )
        )
    return created


def manifest() -> dict:
    """Every binding, shaped for the website.

    One flat map from content address to roles, because that is exactly how
    the site asks: "what image belongs at projectsPage.items[3]?". Assembled in
    a single query -- the site fetches this on a schedule, not per image.
    """
    bindings = (
        MediaBinding.objects.select_related("asset")
        .filter(asset__status=MediaAsset.Status.ACTIVE)
        .order_by("namespace", "path", "role", "position")
    )

    tree: dict[str, dict] = {}
    for binding in bindings:
        asset = binding.asset
        entry = {
            "url": asset.file.url,
            "width": asset.width,
            "height": asset.height,
            "alt": {"en": asset.alt_en, "ar": asset.alt_ar},
        }
        if binding.caption_en or binding.caption_ar:
            entry["caption"] = {"en": binding.caption_en, "ar": binding.caption_ar}

        slot = tree.setdefault(binding.address, {})
        if binding.role == MediaBinding.Role.GALLERY:
            slot.setdefault("gallery", []).append(entry)
        else:
            slot[binding.role] = entry
    return tree
