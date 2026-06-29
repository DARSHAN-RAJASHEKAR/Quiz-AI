import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

from app.models.quiz import Difficulty, QuizStatus, QuizType, SourceType
from app.schemas.question import QuestionPublicResponse


class QuizCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    source_type: SourceType
    source_content: str | None = None  # for text/topic
    quiz_type: QuizType
    num_questions: Annotated[int, Field(ge=1, le=50)] = 10
    difficulty: Difficulty = Difficulty.medium


class QuizSummaryResponse(BaseModel):
    id: uuid.UUID
    title: str
    status: QuizStatus
    quiz_type: QuizType
    num_questions: int
    difficulty: Difficulty
    source_type: SourceType
    created_at: datetime
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}


class QuizDetailResponse(QuizSummaryResponse):
    error_message: str | None = None
    questions: list[QuestionPublicResponse] = []


class QuizListResponse(BaseModel):
    items: list[QuizSummaryResponse]
    total: int
    page: int
    size: int
    pages: int


class JobStatusResponse(BaseModel):
    quiz_id: uuid.UUID
    status: QuizStatus
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
