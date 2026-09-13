"""Real image bytes, made on the spot.

Fixtures on disk would drift from what the tests claim they are; these are
generated, so "a 3000x3000 PNG" is a fact rather than a filename.
"""

from __future__ import annotations

import io

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image


def image_bytes(
    width: int = 400,
    height: int = 300,
    colour: tuple[int, int, int] = (30, 60, 120),
    image_format: str = "JPEG",
) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), colour).save(buffer, format=image_format)
    return buffer.getvalue()


def upload(
    name: str = "photo.jpg",
    *,
    width: int = 400,
    height: int = 300,
    colour: tuple[int, int, int] = (30, 60, 120),
    image_format: str = "JPEG",
    content_type: str = "image/jpeg",
) -> SimpleUploadedFile:
    return SimpleUploadedFile(
        name, image_bytes(width, height, colour, image_format), content_type=content_type
    )
