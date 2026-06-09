import json
from typing import Annotated

import aio_pika
from fastapi import APIRouter, Depends, Form, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.quiz import QuizStatus, QuizType, SourceType
from app.models.user import User
from app.schemas.quiz import QuizDetailResponse, QuizListResponse, QuizSummaryResponse
from app.services import file_service
from app.services.quiz_service import (
    create_quiz,
    delete_quiz,
    get_quiz_for_user,
    list_quizzes,
)
from app.services.rabbitmq_service import get_rabbitmq_connection, publish_quiz_job

router = APIRouter(prefix="/quizzes", tags=["quizzes"])


@router.post("/validate-pdf", status_code=200)
async def validate_pdf_endpoint(
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile,
):
    """
    Pre-flight check: upload a PDF and immediately detect if it's scanned/image-based.
    Returns 200 {"ok": true} if the PDF has extractable text.
    Returns 422 with a human-readable detail if not.
    Does NOT save the file permanently — the temp file is deleted after checking.
    """
    file_path = await file_service.save_upload(file)
    # If save_upload didn't raise, the PDF is valid → clean up the temp file
    file_service.delete_file(file_path)
    return {"ok": True}


@router.post("/", response_model=QuizSummaryResponse, status_code=202)
async def create_quiz_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    # Form fields (supports both JSON body via Form and multipart for PDF)
    title: str = Form(...),
    source_type: SourceType = Form(...),
    quiz_type: QuizType = Form(...),
    num_questions: int = Form(default=10, ge=1, le=100),
    difficulty: str = Form(default="medium"),
    source_content: str | None = Form(default=None),
    file: UploadFile | None = None,
):
    file_path: str | None = None

    if source_type == SourceType.pdf:
        if file is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=422, detail="PDF file required when source_type is 'pdf'")
        file_path = await file_service.save_upload(file)
    elif source_content is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="source_content required for text/topic source types")

    quiz = await create_quiz(
        db=db,
        user=current_user,
        title=title,
        source_type=source_type,
        source_content=source_content,
        file_path=file_path,
        quiz_type=quiz_type,
        num_questions=num_questions,
        difficulty=difficulty,
    )

    # Publish to RabbitMQ
    task = {
        "source_type": source_type.value,
        "source_content": source_content,
        "file_path": file_path,
        "quiz_type": quiz_type.value,
        "num_questions": num_questions,
        "difficulty": difficulty,
        "title": title,
    }

    try:
        connection = await get_rabbitmq_connection()
        async with connection:
            channel = await connection.channel()
            await publish_quiz_job(channel, quiz.id, current_user.id, task)
    except Exception as e:
        # Mark as failed if we can't queue
        quiz.status = QuizStatus.failed
        quiz.error_message = f"Failed to queue job: {str(e)}"

    return QuizSummaryResponse.model_validate(quiz)


@router.get("/", response_model=QuizListResponse)
async def list_quizzes_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    quiz_type: str | None = Query(default=None),
):
    return await list_quizzes(db, current_user, page, size, status, quiz_type)


@router.get("/{quiz_id}", response_model=QuizDetailResponse)
async def get_quiz_endpoint(
    quiz_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    import uuid
    quiz = await get_quiz_for_user(db, uuid.UUID(quiz_id), current_user, load_questions=True)
    return QuizDetailResponse.model_validate(quiz)


@router.delete("/{quiz_id}", status_code=204)
async def delete_quiz_endpoint(
    quiz_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    import uuid
    file_path = await delete_quiz(db, uuid.UUID(quiz_id), current_user)
    file_service.delete_file(file_path)
