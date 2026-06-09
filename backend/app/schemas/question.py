import uuid
from typing import Any

from pydantic import BaseModel

from app.models.question import QuestionType


class QuestionResponse(BaseModel):
    id: uuid.UUID
    question_number: int
    question_type: QuestionType
    question_text: str
    options: list[dict[str, Any]] | None = None
    correct_answer: str
    explanation: str

    model_config = {"from_attributes": True}
