import asyncio
import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.database import get_db
from app.dependencies import get_current_user
from app.models.question import Question
from app.models.quiz import Quiz, QuizStatus
from app.models.user import User
from app.schemas.question import QuestionPublicResponse
from app.schemas.quiz import JobStatusResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])

TERMINAL_STATUSES = {QuizStatus.completed, QuizStatus.failed}


async def _sse_generator(quiz_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession):
    """
    Poll DB every 2 seconds and yield two event types:

    1. `status`    — quiz progress (pending → processing → completed/failed)
    2. `questions` — new questions that have been saved since the last poll

    This enables progressive quiz loading: the frontend can show Q1-10
    while Q11-20 are still being generated in the background.
    """
    sent_question_ids: set[uuid.UUID] = set()

    while True:
        # Fresh query every iteration (session closed at end of loop)
        result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
        quiz = result.scalar_one_or_none()

        if quiz is None:
            yield f"event: error\ndata: {json.dumps({'error': 'Quiz not found'})}\n\n"
            return

        # ── 1. Stream any new questions ──────────────────────────────────
        q_result = await db.execute(
            select(Question)
            .where(Question.quiz_id == quiz_id)
            .order_by(Question.question_number)
        )
        all_questions = q_result.scalars().all()
        new_questions = [q for q in all_questions if q.id not in sent_question_ids]

        if new_questions:
            payload = [QuestionPublicResponse.model_validate(q).model_dump(mode="json") for q in new_questions]
            yield f"event: questions\ndata: {json.dumps(payload)}\n\n"
            sent_question_ids.update(q.id for q in new_questions)

        # ── 2. Stream status with chunk progress ─────────────────────────
        chunks_total     = quiz.chunks_total or 1
        chunks_completed = quiz.chunks_completed or 0

        # Progress: processing = 0.1 + 0.85 * (chunks done / chunks total)
        # so it moves from 10% → 95% as chunks complete, then 100% at done
        if quiz.status == QuizStatus.pending:
            progress = 0.05
            message  = "Queued — waiting for worker..."
        elif quiz.status == QuizStatus.processing:
            progress = 0.10 + 0.85 * (chunks_completed / chunks_total)
            if chunks_total == 1:
                message = "Generating quiz questions..."
            else:
                message = f"Generated questions from section {chunks_completed} of {chunks_total}..."
        elif quiz.status == QuizStatus.completed:
            progress = 1.0
            message  = "Quiz ready!"
        else:  # failed
            progress = 1.0
            message  = quiz.error_message or "Generation failed."

        status_payload = {
            "quiz_id":          str(quiz_id),
            "status":           quiz.status.value,
            "progress":         round(progress, 2),
            "message":          message,
            "chunks_total":     chunks_total,
            "chunks_completed": chunks_completed,
            "questions_ready":  len(sent_question_ids),
        }
        event_type = "error" if quiz.status == QuizStatus.failed else "status"
        yield f"event: {event_type}\ndata: {json.dumps(status_payload)}\n\n"

        if quiz.status in TERMINAL_STATUSES:
            return

        await db.close()
        await asyncio.sleep(2)


@router.get("/{quiz_id}/status/stream")
async def job_status_stream(
    quiz_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """SSE endpoint — auth via Authorization: Bearer header (uses fetch-event-source)."""
    qid = uuid.UUID(quiz_id)

    result = await db.execute(select(Quiz).where(Quiz.id == qid))
    quiz = result.scalar_one_or_none()
    if quiz is None:
        raise NotFoundException("Quiz not found")
    if quiz.user_id != current_user.id:
        raise ForbiddenException()

    return StreamingResponse(
        _sse_generator(qid, current_user.id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection":    "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{quiz_id}/status", response_model=JobStatusResponse)
async def job_status_poll(
    quiz_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Polling fallback for clients that don't support SSE."""
    qid = uuid.UUID(quiz_id)
    result = await db.execute(select(Quiz).where(Quiz.id == qid))
    quiz = result.scalar_one_or_none()

    if quiz is None:
        raise NotFoundException("Quiz not found")
    if quiz.user_id != current_user.id:
        raise ForbiddenException()

    return JobStatusResponse.model_validate(quiz)
