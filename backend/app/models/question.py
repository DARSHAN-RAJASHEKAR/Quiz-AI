import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class QuestionType(str, enum.Enum):
    mcq = "mcq"
    true_false = "true_false"
    short_answer = "short_answer"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, name="questiontype"), nullable=False
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    # MCQ: [{"label": "A", "text": "..."}, ...]
    # True/False: [{"label": "True", "text": "True"}, {"label": "False", "text": "False"}]
    # Short answer: null
    options: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)

    quiz: Mapped["Quiz"] = relationship(back_populates="questions")  # noqa: F821
