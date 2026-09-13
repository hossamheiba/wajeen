"""Real document bytes, made on the spot.

Fixtures on disk would drift from what the tests claim they are; these are
generated, so "a PDF" and "a ZIP that is not a Word document" are facts rather
than filenames.
"""

from __future__ import annotations

import io
import uuid
import zipfile

from django.core.files.uploadedfile import SimpleUploadedFile


def pdf_bytes(size: int = 400) -> bytes:
    body = b"%PDF-1.4\n1 0 obj<< /Type /Catalog >>endobj\n"
    return body + b"%" * max(0, size - len(body) - 6) + b"\n%%EOF\n"


def docx_bytes(*, with_document: bool = True) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        if with_document:
            archive.writestr("word/document.xml", "<w:document/>")
        else:
            archive.writestr("xl/workbook.xml", "<workbook/>")
    return buffer.getvalue()


def upload(name: str = "cv.pdf", content: bytes | None = None, content_type: str = "application/pdf"):
    return SimpleUploadedFile(name, pdf_bytes() if content is None else content, content_type=content_type)


def key() -> str:
    return str(uuid.uuid4())


def contact_payload(**over) -> dict:
    data = {
        "idempotency_key": key(),
        "kind": "contact",
        "locale": "en",
        "name": "Omar",
        "email": "omar@example.com",
        "phone": "+966500000000",
        "send_to": "ceo",
        "message": "Please send the company profile.",
    }
    data.update(over)
    return data


def vendor_payload(**over) -> dict:
    data = {
        "idempotency_key": key(),
        "kind": "vendor",
        "locale": "en",
        "name": "Sara",
        "email": "sara@gulfsteel.example",
        "phone": "+966511111111",
        "company_name": "Gulf Steel Co.",
        "city": "jubail",
        "service_type": "material_supply",
        "is_aramco_vendor": False,
        "message": "We would like to register as a vendor.",
    }
    data.update(over)
    return data


def career_payload(**over) -> dict:
    data = {
        "idempotency_key": key(),
        "kind": "career",
        "locale": "en",
        "name": "Ali",
        "email": "ali@example.com",
        "phone": "+966522222222",
    }
    data.update(over)
    return data
