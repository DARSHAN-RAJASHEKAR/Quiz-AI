import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.attempt import AttemptListResponse, AttemptResponse, AttemptSubmitRequest
from app.services.attempt_service import get_attempt, list_attempts, submit_attempt

router = APIRouter(prefix="/attempts", tags=["attempts"])


@router.post("/", response_model=AttemptResponse, status_code=201)
async def submit_attempt_endpoint(
    data: AttemptSubmitRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await submit_attempt(db, current_user, data)


@router.get("/", response_model=AttemptListResponse)
async def list_attempts_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    quiz_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
):
    qid = uuid.UUID(quiz_id) if quiz_id else None
    return await list_attempts(db, current_user, qid, page, size)


@router.get("/{attempt_id}", response_model=AttemptResponse)
async def get_attempt_endpoint(
    attempt_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await get_attempt(db, uuid.UUID(attempt_id), current_user)
