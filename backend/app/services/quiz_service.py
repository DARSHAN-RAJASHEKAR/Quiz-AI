import math
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.quiz import Quiz, QuizStatus, SourceType
from app.models.user import User
from app.schemas.quiz import QuizListResponse, QuizSummaryResponse


async def create_quiz(
    db: AsyncSession,
    user: User,
    title: str,
    source_type: SourceType,
    source_content: str | None,
    file_path: str | None,
    quiz_type: str,
    num_questions: int,
    difficulty: str,
) -> Quiz:
    quiz = Quiz(
        user_id=user.id,
        title=title,
        source_type=source_type,
        source_content=source_content,
        file_path=file_path,
        quiz_type=quiz_type,
        num_questions=num_questions,
        difficulty=difficulty,
        status=QuizStatus.pending,
    )
    db.add(quiz)
    await db.flush()
    await db.refresh(quiz)
    return quiz


async def get_quiz_for_user(
    db: AsyncSession, quiz_id: uuid.UUID, user: User, load_questions: bool = False
) -> Quiz:
    stmt = select(Quiz).where(Quiz.id == quiz_id)
    if load_questions:
        stmt = stmt.options(selectinload(Quiz.questions))

    result = await db.execute(stmt)
    quiz = result.scalar_one_or_none()

    if quiz is None:
        raise NotFoundException("Quiz not found")
    if quiz.user_id != user.id:
        raise ForbiddenException()
    return quiz


async def list_quizzes(
    db: AsyncSession,
    user: User,
    page: int = 1,
    size: int = 20,
    status: str | None = None,
    quiz_type: str | None = None,
) -> QuizListResponse:
    stmt = select(Quiz).where(Quiz.user_id == user.id)
    count_stmt = select(func.count()).select_from(Quiz).where(Quiz.user_id == user.id)

    if status:
        stmt = stmt.where(Quiz.status == status)
        count_stmt = count_stmt.where(Quiz.status == status)
    if quiz_type:
        stmt = stmt.where(Quiz.quiz_type == quiz_type)
        count_stmt = count_stmt.where(Quiz.quiz_type == quiz_type)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Quiz.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    quizzes = result.scalars().all()

    return QuizListResponse(
        items=[QuizSummaryResponse.model_validate(q) for q in quizzes],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total else 0,
    )


async def delete_quiz(db: AsyncSession, quiz_id: uuid.UUID, user: User) -> str | None:
    quiz = await get_quiz_for_user(db, quiz_id, user)
    file_path = quiz.file_path
    await db.delete(quiz)
    return file_path
