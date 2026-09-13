"""What may be attached to a job application, and what is refused.

Every check answers a question the *bytes* can answer. The browser's
`Content-Type` and the extension on the filename are both attacker-controlled;
the first four bytes of the file are not.

    PDF   %PDF-
    DOCX  a ZIP container (PK\\x03\\x04) that holds word/document.xml

A `.pdf` whose bytes are a JPEG is refused. A ZIP that is not a Word document
is refused. Pillow is never involved -- these are documents, and handing a
document to an image decoder would be both pointless and a new attack surface.

=============================================================================
THIS IS NOT VIRUS SCANNING.
=============================================================================
There is no ClamAV, no scanning service and no malware detection anywhere in
this project. Allow-listing two container formats says what a file *is*, not
whether its contents are safe: a malicious PDF and a macro-bearing DOCX both
pass every check in this module. Nothing here may be read as a claim that an
uploaded file is malware-free.

What does reduce the risk, and is real: the file is never executed, never
rendered, never opened on the server, has no public URL, and can only be
fetched by a signed-in user holding an explicit permission. Actual scanning is
an infrastructure decision that has not been taken -- see the report.
"""

from __future__ import annotations

import zipfile
from dataclasses import dataclass

from django.conf import settings
from django.core.exceptions import ValidationError

from .storage import CONTENT_TYPE_FOR_FORMAT, EXTENSION_FOR_FORMAT, checksum_of

PDF_MAGIC = b"%PDF-"
ZIP_MAGIC = b"PK\x03\x04"
#: An empty-but-valid zip, and a spanned archive. Neither can be a .docx, but
#: both start with PK, so they are named rather than guessed at.
ZIP_EMPTY = b"PK\x05\x06"
ZIP_SPANNED = b"PK\x07\x08"


@dataclass(frozen=True)
class Probe:
    """What the bytes turned out to be."""

    checksum: str
    bytes: int
    doc_format: str
    content_type: str
    extension: str


def _sniff(head: bytes, upload) -> str:
    if head.startswith(PDF_MAGIC):
        return "PDF"

    if head.startswith((ZIP_MAGIC, ZIP_EMPTY, ZIP_SPANNED)):
        # A .docx is a zip with a known member. Checking the container's index
        # is what separates a Word document from a renamed archive of anything.
        upload.seek(0)
        try:
            with zipfile.ZipFile(upload) as archive:
                names = set(archive.namelist())
        except (zipfile.BadZipFile, OSError, ValueError):
            raise ValidationError("That file looks like a damaged archive.") from None
        finally:
            upload.seek(0)

        if "word/document.xml" in names:
            return "DOCX"
        raise ValidationError(
            "That file is a ZIP archive but not a Word document. Attach a PDF "
            "or a .docx file."
        )

    raise ValidationError("That file is not a PDF or a Word document.")


def inspect(upload) -> Probe:
    """Decide whether an uploaded file may be kept as a CV.

    Raises ValidationError with a message written for a person -- never a
    stack trace, and never the raw library error.
    """
    size = getattr(upload, "size", None)
    if size is None:
        upload.seek(0, 2)
        size = upload.tell()
        upload.seek(0)

    if size == 0:
        raise ValidationError("That file is empty.")

    limit = settings.WJEEN_CV_MAX_BYTES
    if size > limit:
        raise ValidationError(
            f"That file is {size / 1_048_576:.1f} MB. "
            f"The limit is {limit / 1_048_576:.0f} MB."
        )

    # Read only the signature: size is already known to be within the limit,
    # and a format decision does not need the whole document in memory.
    upload.seek(0)
    head = upload.read(8)
    upload.seek(0)

    doc_format = _sniff(head, upload)

    return Probe(
        checksum=checksum_of(upload),
        bytes=size,
        doc_format=doc_format,
        content_type=CONTENT_TYPE_FOR_FORMAT[doc_format],
        extension=EXTENSION_FOR_FORMAT[doc_format],
    )
