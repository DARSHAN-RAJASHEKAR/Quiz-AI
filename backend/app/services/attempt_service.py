import math
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.quiz import Quiz, QuizStatus
from app.models.quiz_attempt import QuizAttempt
from app.models.user import User
from app.schemas.attempt import (
    AttemptListResponse,
    AttemptResponse,
    AttemptSubmitRequest,
    AttemptSummaryResponse,
    PerQuestionResult,
)


def _is_correct(question_type: str, user_answer: str, correct_answer: str) -> bool:
    """Score a single answer."""
    ua = (user_answer or "").strip()
    ca = correct_answer.strip()

    if question_type in ("mcq", "true_false"):
        return ua.upper() == ca.upper()
    elif question_type == "short_answer":
        # Case-insensitive substring match
        return ca.lower() in ua.lower() or ua.lower() in ca.lower()
    return False


async def submit_attempt(
    db: AsyncSession, user: User, data: AttemptSubmitRequest
) -> AttemptResponse:
    # Load quiz with questions
    stmt = (
        select(Quiz)
        .where(Quiz.id == data.quiz_id)
        .options(selectinload(Quiz.questions))
    )
    result = await db.execute(stmt)
    quiz = result.scalar_one_or_none()

    if quiz is None:
        raise NotFoundException("Quiz not found")
    if quiz.status != QuizStatus.completed:
        raise NotFoundException("Quiz is not ready yet")

    per_question: list[PerQuestionResult] = []
    correct_count = 0

    for q in quiz.questions:
        user_answer = data.answers.get(str(q.id))
        correct = _is_correct(q.question_type.value, user_answer or "", q.correct_answer)
        if correct:
            correct_count += 1
        per_question.append(
            PerQuestionResult(
                question_id=q.id,
                question_number=q.question_number,
                question_text=q.question_text,
                user_answer=user_answer,
                correct_answer=q.correct_answer,
                is_correct=correct,
                explanation=q.explanation,
            )
        )

    total = len(quiz.questions)
    score = (correct_count / total * 100) if total > 0 else 0.0

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        user_id=user.id,
        answers={str(k): v for k, v in data.answers.items()},
        score=round(score, 2),
    )
    db.add(attempt)
    await db.flush()
    await db.refresh(attempt)

    return AttemptResponse(
        id=attempt.id,
        quiz_id=quiz.id,
        score=round(score, 2),
        total_questions=total,
        correct=correct_count,
        incorrect=total - correct_count,
        per_question=per_question,
        completed_at=attempt.completed_at,
    )


async def get_attempt(
    db: AsyncSession, attempt_id: uuid.UUID, user: User
) -> AttemptResponse:
    stmt = (
        select(QuizAttempt)
        .where(QuizAttempt.id == attempt_id)
        .options(selectinload(QuizAttempt.quiz).selectinload(Quiz.questions))
    )
    result = await db.execute(stmt)
    attempt = result.scalar_one_or_none()

    if attempt is None:
        raise NotFoundException("Attempt not found")
    if attempt.user_id != user.id:
        raise ForbiddenException()

    quiz = attempt.quiz
    per_question = []
    correct_count = 0

    for q in quiz.questions:
        user_answer = attempt.answers.get(str(q.id))
        correct = _is_correct(q.question_type.value, user_answer or "", q.correct_answer)
        if correct:
            correct_count += 1
        per_question.append(
            PerQuestionResult(
                question_id=q.id,
                question_number=q.question_number,
                question_text=q.question_text,
                user_answer=user_answer,
                correct_answer=q.correct_answer,
                is_correct=correct,
                explanation=q.explanation,
            )
        )

    total = len(quiz.questions)
    return AttemptResponse(
        id=attempt.id,
        quiz_id=quiz.id,
        score=attempt.score or 0.0,
        total_questions=total,
        correct=correct_count,
        incorrect=total - correct_count,
        per_question=per_question,
        completed_at=attempt.completed_at,
    )


async def list_attempts(
    db: AsyncSession,
    user: User,
    quiz_id: uuid.UUID | None,
    page: int,
    size: int,
) -> AttemptListResponse:
    stmt = select(QuizAttempt).where(QuizAttempt.user_id == user.id)
    count_stmt = (
        select(func.count())
        .select_from(QuizAttempt)
        .where(QuizAttempt.user_id == user.id)
    )

    if quiz_id:
        stmt = stmt.where(QuizAttempt.quiz_id == quiz_id)
        count_stmt = count_stmt.where(QuizAttempt.quiz_id == quiz_id)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(QuizAttempt.completed_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    attempts = result.scalars().all()

    return AttemptListResponse(
        items=[AttemptSummaryResponse.model_validate(a) for a in attempts],
        total=total,
        page=page,
        size=size,
    )
