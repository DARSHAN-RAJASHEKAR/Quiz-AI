import uuid
from typing import Any

from pydantic import BaseModel

from app.models.question import QuestionType


class QuestionPublicResponse(BaseModel):
    """Safe for pre-submission exposure — no answers or explanations."""
    id: uuid.UUID
    question_number: int
    question_type: QuestionType
    question_text: str
    options: list[dict[str, Any]] | None = None

    model_config = {"from_attributes": True}


class QuestionResponse(QuestionPublicResponse):
    """Full question data — only returned after attempt submission."""
    correct_answer: str
    explanation: str
