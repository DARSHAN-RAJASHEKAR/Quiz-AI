import re
from pathlib import Path

import pdfplumber

# Maximum chars to send in a single AI call.
# 400k chars ≈ 100k tokens — DeepSeek handles this fine.
MAX_CHARS_SINGLE = 400_000

# If the PDF is larger than 400k chars, split into chunks of this size.
CHUNK_CHARS = 400_000
MAX_CHUNKS  = 5        # hard cap (handles ~1000-page books)


def extract_pdf_pages(file_path: str) -> tuple[list[str], int]:
    """
    Extract text from every page of a PDF.

    Returns:
        (page_texts, num_pages)
        page_texts — list of cleaned text strings, one per page that has text.
                     Empty/blank pages are skipped.
        num_pages  — TOTAL page count of the PDF (including blank pages),
                     used by compute_workers() for the page-based formula.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    page_texts: list[str] = []
    total_pages: int = 0

    with pdfplumber.open(str(path)) as pdf:
        total_pages = len(pdf.pages)
        for page in pdf.pages:
            text = page.extract_text() or ""
            cleaned = _clean_text(text)
            if cleaned:
                page_texts.append(cleaned)

    if not page_texts:
        raise ValueError(
            "This PDF contains no extractable text. "
            "It appears to be a scanned image-based PDF. "
            "Please upload a digital PDF where text can be selected and copied."
        )

    return page_texts, total_pages


def split_pages_into_chunks(page_texts: list[str], n: int) -> list[str]:
    """
    Group page_texts into exactly n chunks of roughly equal size.
    Pages within each chunk are joined with double newlines.
    Returns a list of n non-empty strings.
    """
    if n <= 1 or len(page_texts) <= 1:
        return ["\n\n".join(page_texts)]

    n = min(n, len(page_texts))  # can't have more chunks than pages
    chunk_size = len(page_texts) / n
    chunks: list[str] = []

    for i in range(n):
        start = round(i * chunk_size)
        end   = round((i + 1) * chunk_size)
        group = page_texts[start:end]
        if group:
            chunks.append("\n\n".join(group))

    return [c for c in chunks if c.strip()]


# ── Legacy helpers (kept for backward compat) ───────────────────────────────

def extract_pdf_chunks(file_path: str) -> list[str]:
    """
    Legacy char-based chunking. Kept for backward compat.
    New code uses extract_pdf_pages() + split_pages_into_chunks().
    """
    page_texts, _ = extract_pdf_pages(file_path)
    full_text = "\n\n".join(page_texts)

    if len(full_text) <= MAX_CHARS_SINGLE:
        return [full_text]

    num_chunks = min(MAX_CHUNKS, -(-len(full_text) // CHUNK_CHARS))
    chunk_size = len(full_text) // num_chunks
    chunks: list[str] = []

    for i in range(num_chunks):
        start = i * chunk_size
        end   = len(full_text) if i == num_chunks - 1 else (i + 1) * chunk_size
        if end < len(full_text):
            snap = full_text.rfind("\n\n", start, end + 500)
            if snap > start:
                end = snap
        chunk = full_text[start:end].strip()
        if chunk:
            chunks.append(chunk)

    return chunks


def extract_pdf_text(file_path: str) -> str:
    return "\n\n".join(extract_pdf_chunks(file_path))


def _clean_text(text: str) -> str:
    """Remove excessive whitespace and non-printable characters."""
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[^\x09\x0a\x0d\x20-\x7e-￿]", "", text)
    return text.strip()
