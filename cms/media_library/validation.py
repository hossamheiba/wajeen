"""What may be uploaded, and what is refused.

Every check here answers a question the *file* can answer, never one the
*request* claims. A browser's `Content-Type` header and the extension on a
filename are both attacker-controlled; Pillow opening the bytes is not.

The order matters. Size is checked before decoding so a 2GB "image" is
rejected without being read, and the decompression-bomb guard is armed before
`Image.open` so a 200-byte PNG that expands to 40,000 x 40,000 cannot take the
process down with it.
"""

from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError
from PIL.Image import DecompressionBombError

from .storage import CONTENT_TYPE_FOR_FORMAT, EXTENSION_FOR_FORMAT, checksum_of


@dataclass(frozen=True)
class Probe:
    """What the bytes turned out to be."""

    checksum: str
    width: int
    height: int
    bytes: int
    image_format: str
    content_type: str
    extension: str


def inspect(upload) -> Probe:
    """Decide whether an uploaded file is an image this library will keep.

    Raises ValidationError with a message meant for a person, never a stack
    trace and never the raw Pillow error.
    """
    size = getattr(upload, "size", None)
    if size is None:
        upload.seek(0, 2)
        size = upload.tell()
        upload.seek(0)

    if size == 0:
        raise ValidationError("That file is empty.")

    limit = settings.WJEEN_MEDIA_MAX_BYTES
    if size > limit:
        raise ValidationError(
            f"That file is {size / 1_048_576:.1f} MB. "
            f"The limit is {limit / 1_048_576:.0f} MB."
        )

    # A decompression bomb is a small file that decodes into an enormous
    # bitmap. Pillow will refuse past this many pixels rather than allocate.
    previous_limit = Image.MAX_IMAGE_PIXELS
    Image.MAX_IMAGE_PIXELS = settings.WJEEN_MEDIA_MAX_PIXELS
    try:
        upload.seek(0)
        try:
            with Image.open(upload) as probe:
                probe.verify()  # structural check; consumes the file object
        except DecompressionBombError:
            # Pillow raises this from `Image.open`, before decoding, and it
            # descends from Exception rather than OSError -- so it needs
            # catching by name or it escapes as a 500.
            raise ValidationError(
                f"That image decodes to more than "
                f"{settings.WJEEN_MEDIA_MAX_PIXELS:,} pixels, which is too "
                f"large to process."
            ) from None
        except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
            raise ValidationError(
                "That file is not an image, or it is damaged."
            ) from None

        # `verify()` leaves the image unusable, so reopen for the real read.
        upload.seek(0)
        try:
            with Image.open(upload) as image:
                image_format = (image.format or "").upper()
                width, height = image.size
                # Force a full decode: a truncated JPEG passes `verify()` and
                # only fails when the pixels are actually wanted.
                image.load()
        except DecompressionBombError:
            raise ValidationError(
                f"That image decodes to more than "
                f"{settings.WJEEN_MEDIA_MAX_PIXELS:,} pixels, which is too "
                f"large to process."
            ) from None
        except (UnidentifiedImageError, OSError, ValueError, SyntaxError):
            raise ValidationError(
                "That image could not be read all the way through; it may be "
                "truncated."
            ) from None
    finally:
        Image.MAX_IMAGE_PIXELS = previous_limit
        upload.seek(0)

    if image_format not in EXTENSION_FOR_FORMAT:
        accepted = ", ".join(sorted(EXTENSION_FOR_FORMAT))
        raise ValidationError(
            f"{image_format or 'That format'} is not accepted. Use {accepted}."
        )

    smallest = settings.WJEEN_MEDIA_MIN_EDGE
    if width < smallest or height < smallest:
        raise ValidationError(
            f"That image is {width}x{height}. The smallest accepted edge is "
            f"{smallest} pixels."
        )

    largest = settings.WJEEN_MEDIA_MAX_EDGE
    if width > largest or height > largest:
        raise ValidationError(
            f"That image is {width}x{height}. The longest accepted edge is "
            f"{largest} pixels."
        )

    return Probe(
        checksum=checksum_of(upload),
        width=width,
        height=height,
        bytes=size,
        image_format=image_format,
        content_type=CONTENT_TYPE_FOR_FORMAT[image_format],
        extension=EXTENSION_FOR_FORMAT[image_format],
    )
