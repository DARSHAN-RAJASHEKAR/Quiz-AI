import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession


async def update_quiz_status(
    db: AsyncSession,
    quiz_id: uuid.UUID,
    status: str,
    error_message: str | None = None,
) -> None:
    from sqlalchemy import text
    if status == "completed":
        await db.execute(
            text("UPDATE quizzes SET status=:status, completed_at=:now WHERE id=:id"),
            {"status": status, "now": datetime.now(timezone.utc), "id": str(quiz_id)},
        )
    elif status == "failed":
        await db.execute(
            text("UPDATE quizzes SET status=:status, error_message=:err WHERE id=:id"),
            {"status": status, "err": error_message, "id": str(quiz_id)},
        )
    else:
        await db.execute(
            text("UPDATE quizzes SET status=:status WHERE id=:id"),
            {"status": status, "id": str(quiz_id)},
        )
    await db.commit()


async def set_chunks_total(
    db: AsyncSession,
    quiz_id: uuid.UUID,
    chunks_total: int,
) -> None:
    """Set how many chunks were dispatched for a PDF quiz."""
    from sqlalchemy import text
    await db.execute(
        text("UPDATE quizzes SET chunks_total=:total WHERE id=:id"),
        {"total": chunks_total, "id": str(quiz_id)},
    )
    await db.commit()


async def complete_chunk(
    db: AsyncSession,
    quiz_id: uuid.UUID,
    chunks_total: int,
) -> bool:
    """
    Atomically increment chunks_completed.
    Returns True if this was the LAST chunk (all done).
    """
    from sqlalchemy import text
    result = await db.execute(
        text("""
            UPDATE quizzes
               SET chunks_completed = chunks_completed + 1
             WHERE id = :id
            RETURNING chunks_completed
        """),
        {"id": str(quiz_id)},
    )
    row = result.fetchone()
    await db.commit()
    completed = row[0] if row else 0
    return completed >= chunks_total


async def get_chunks_completed(
    db: AsyncSession,
    quiz_id: uuid.UUID,
) -> int:
    """Return the current chunks_completed count for a quiz."""
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT chunks_completed FROM quizzes WHERE id = :id"),
        {"id": str(quiz_id)},
    )
    row = result.fetchone()
    return row[0] if row else 0


async def get_existing_question_texts(
    db: AsyncSession,
    quiz_id: uuid.UUID,
) -> list[str]:
    """
    Return all question_text values already saved for this quiz,
    ordered by question_number. Used to give subsequent AI batches
    context so they generate non-duplicate questions.
    """
    from sqlalchemy import text
    result = await db.execute(
        text("""
            SELECT question_text
              FROM questions
             WHERE quiz_id = :id
             ORDER BY question_number
        """),
        {"id": str(quiz_id)},
    )
    return [row[0] for row in result.fetchall()]


async def get_question_count(
    db: AsyncSession,
    quiz_id: uuid.UUID,
) -> int:
    """Count questions already saved for a quiz (used for numbering offset)."""
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT COUNT(*) FROM questions WHERE quiz_id = :id"),
        {"id": str(quiz_id)},
    )
    return result.scalar() or 0


async def save_questions(
    db: AsyncSession,
    quiz_id: uuid.UUID,
    questions: list[dict],
    question_offset: int = 0,
) -> None:
    """
    Insert parsed questions into the DB.

    question_offset — pre-computed by the coordinator/worker so question
    numbers are globally unique even when multiple workers run in parallel.
    Pass 0 for single-worker quizzes.
    """
    import json as _json
    from sqlalchemy import text

    offset = question_offset

    for q in questions:
        options_json = _json.dumps(q.get("options")) if q.get("options") else None
        question_num = q["question_number"] + offset

        await db.execute(
            text("""
                INSERT INTO questions
                  (id, quiz_id, question_number, question_type, question_text,
                   options, correct_answer, explanation)
                VALUES
                  (uuid_generate_v4(), :quiz_id, :num, :qtype, :qtext,
                   CAST(:options AS jsonb), :answer, :explanation)
            """),
            {
                "quiz_id":     str(quiz_id),
                "num":         question_num,
                "qtype":       q["question_type"],
                "qtext":       q["question_text"],
                "options":     options_json,
                "answer":      q["correct_answer"],
                "explanation": q["explanation"],
            },
        )
    await db.commit()
