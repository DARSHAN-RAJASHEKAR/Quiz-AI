import os
import uuid
from pathlib import Path

import pdfplumber
from fastapi import HTTPException, UploadFile

from app.config import get_settings
from app.core.exceptions import FileTooLargeException, UnsupportedMediaException

settings = get_settings()

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/x-pdf",
}

# How many pages to sample when checking for extractable text.
# Checking 3 pages is fast (~50ms) and reliable enough.
SCAN_CHECK_PAGES = 3


async def save_upload(file: UploadFile) -> str:
    """
    Validate, save, and pre-screen an uploaded PDF.

    Raises HTTPException 422 immediately if the PDF is scanned/image-based
    so the user gets instant feedback instead of a delayed worker failure.
    """
    # ── 1. Validate content type ────────────────────────────────────────
    content_type = file.content_type or ""
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise UnsupportedMediaException()

    # ── 2. Validate size ────────────────────────────────────────────────
    contents = await file.read()
    if len(contents) > settings.max_upload_size_bytes:
        raise FileTooLargeException(settings.max_upload_size_mb)

    # ── 3. Verify PDF magic bytes (%PDF-) — prevents MIME-spoofed uploads ──
    if not contents.startswith(b"%PDF-"):
        raise UnsupportedMediaException()

    # ── 4. Save to disk ─────────────────────────────────────────────────
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}.pdf"
    file_path = upload_dir / filename
    file_path.write_bytes(contents)

    # ── 5. Detect scanned / image-based PDF ─────────────────────────────
    # Sample the first few pages — no need to read the whole file.
    # If none of the sampled pages yield any text, it's almost certainly
    # a scanned PDF and we reject it immediately.
    try:
        _check_pdf_has_text(str(file_path))
    except HTTPException:
        # Clean up the saved file before re-raising
        _delete(str(file_path))
        raise

    return str(file_path)


def _check_pdf_has_text(file_path: str) -> None:
    """
    Open the PDF and sample up to SCAN_CHECK_PAGES pages.
    Raises HTTP 422 if no extractable text is found.
    """
    try:
        with pdfplumber.open(file_path) as pdf:
            pages_to_check = pdf.pages[:SCAN_CHECK_PAGES]
            extracted = " ".join(
                (page.extract_text() or "") for page in pages_to_check
            ).strip()
    except Exception:
        # If pdfplumber can't even open it, let the worker give the real error
        return

    if not extracted:
        raise HTTPException(
            status_code=422,
            detail=(
                "This PDF appears to be a scanned image and contains no extractable text. "
                "Please upload a digital PDF where the text can be selected and copied. "
                "Scanned PDFs require OCR processing, which is not currently supported."
            ),
        )


def delete_file(file_path: str | None) -> None:
    """Delete uploaded file if it exists."""
    _delete(file_path)


def _delete(file_path: str | None) -> None:
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass
