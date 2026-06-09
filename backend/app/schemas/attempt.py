import uuid
from datetime import datetime

from pydantic import BaseModel


class AttemptSubmitRequest(BaseModel):
    quiz_id: uuid.UUID
    answers: dict[str, str]  # {question_id: answer}


class PerQuestionResult(BaseModel):
    question_id: uuid.UUID
    question_number: int
    question_text: str
    user_answer: str | None
    correct_answer: str
    is_correct: bool
    explanation: str


class AttemptResponse(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    score: float
    total_questions: int
    correct: int
    incorrect: int
    per_question: list[PerQuestionResult]
    completed_at: datetime

    model_config = {"from_attributes": True}


class AttemptSummaryResponse(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    score: float | None
    completed_at: datetime

    model_config = {"from_attributes": True}


class AttemptListResponse(BaseModel):
    items: list[AttemptSummaryResponse]
    total: int
    page: int
    size: int
