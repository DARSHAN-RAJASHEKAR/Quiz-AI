import re

MAX_CHARS = 40_000


def extract_text(content: str) -> str:
    """Clean and truncate plain text input."""
    text = re.sub(r"\n{3,}", "\n\n", content)
    text = text.strip()
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + "\n\n[... truncated ...]"
    return text
