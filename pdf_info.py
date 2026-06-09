"""
PDF Characteristics Analyzer
Usage: python pdf_info.py <path-to-pdf>
"""
import sys
import pdfplumber

def analyze_pdf(path: str):
    with pdfplumber.open(path) as pdf:
        total_pages = len(pdf.pages)

        page_stats = []
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            chars = len(text.strip())
            words = len(text.split()) if text.strip() else 0
            page_stats.append({
                "page": i + 1,
                "chars": chars,
                "words": words,
            })

    total_chars = sum(p["chars"] for p in page_stats)
    total_words = sum(p["words"] for p in page_stats)
    avg_chars   = total_chars // total_pages if total_pages else 0
    empty_pages = sum(1 for p in page_stats if p["chars"] == 0)

    # Smart worker formula
    MAX_Q_PER_CALL = 20

    def compute_workers(pages, questions):
        if pages <= 20:
            workers = 1
        elif pages <= 40:
            workers = 3
        else:
            workers = min(pages // 20, 10)
        workers = min(workers, max(1, questions // 5))
        return max(1, workers)

    print("=" * 55)
    print(f"  PDF CHARACTERISTICS")
    print("=" * 55)
    print(f"  File          : {path}")
    print(f"  Pages         : {total_pages}")
    print(f"  Empty pages   : {empty_pages}  (no extractable text)")
    print(f"  Total chars   : {total_chars:,}")
    print(f"  Total words   : {total_words:,}")
    print(f"  Avg chars/page: {avg_chars:,}")
    print(f"  Avg words/page: {total_words // total_pages if total_pages else 0:,}")
    print()

    # Text density
    if avg_chars > 2000:
        density = "HIGH  — dense text (textbook, article)"
    elif avg_chars > 800:
        density = "MEDIUM — normal text"
    elif avg_chars > 200:
        density = "LOW   — sparse text (slides, diagrams)"
    else:
        density = "VERY LOW — mostly images/scanned"
    print(f"  Text density  : {density}")
    print()

    # Current chunking (200k chars)
    CHUNK_CHARS = 200_000
    current_chunks = max(1, -(-total_chars // CHUNK_CHARS))  # ceil div
    print(f"  Current chunking (200k chars): {current_chunks} chunk(s)")
    print()

    # Question simulation
    print("-" * 55)
    print(f"  WORKER SIMULATION (new formula)")
    print("-" * 55)
    print(f"  {'Questions':>12} | {'Workers':>8} | {'Pages/worker':>13} | {'Q/worker':>9} | {'AI calls':>9} | {'Est. time':>10}")
    print(f"  {'-'*12}-+-{'-'*8}-+-{'-'*13}-+-{'-'*9}-+-{'-'*9}-+-{'-'*10}")

    for q in [10, 20, 40, 60, 80, 100]:
        workers = compute_workers(total_pages, q)
        pages_per_worker = round(total_pages / workers, 1)
        q_per_worker = round(q / workers, 1)

        # AI calls per worker: 1 if q/worker <= 20, else ceil(q/worker / 20)
        import math
        calls_per_worker = math.ceil(q_per_worker / MAX_Q_PER_CALL)

        # Time: calls_per_worker × 30s (sequential within worker, workers parallel)
        est_time = calls_per_worker * 30

        mode = "parallel ✅" if calls_per_worker == 1 else f"{calls_per_worker} loops"
        print(f"  {q:>12} | {workers:>8} | {pages_per_worker:>13} | {q_per_worker:>9} | {mode:>9} | ~{est_time:>6}s")

    print("=" * 55)
    print()

    # Per-page breakdown (first 5 and last 5)
    print("  PAGE-BY-PAGE SAMPLE")
    print("-" * 55)
    sample = page_stats[:5] + (page_stats[-5:] if total_pages > 10 else [])
    printed = set()
    for p in sample:
        if p["page"] in printed:
            continue
        printed.add(p["page"])
        bar = "█" * min(40, p["chars"] // 100)
        print(f"  Page {p['page']:>4}: {p['chars']:>6} chars  {bar}")
    if total_pages > 10:
        print(f"  ... ({total_pages - 10} pages not shown)")
    print("=" * 55)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_info.py <path-to-pdf>")
        sys.exit(1)
    analyze_pdf(sys.argv[1])
