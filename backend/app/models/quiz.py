import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class SourceType(str, enum.Enum):
    pdf = "pdf"
    text = "text"
    topic = "topic"


class QuizStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class QuizType(str, enum.Enum):
    mcq = "mcq"
    true_false = "true_false"
    short_answer = "short_answer"
    mixed = "mixed"


class Difficulty(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class Quiz(Base, TimestampMixin):
    __tablename__ = "quizzes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    source_type: Mapped[SourceType] = mapped_column(
        Enum(SourceType, name="sourcetype"), nullable=False
    )
    # Stored text content (for text/topic source, or extracted PDF text)
    source_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Original uploaded file path (for pdf source)
    file_path: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[QuizStatus] = mapped_column(
        Enum(QuizStatus, name="quizstatus"),
        default=QuizStatus.pending,
        nullable=False,
        index=True,
    )
    quiz_type: Mapped[QuizType] = mapped_column(
        Enum(QuizType, name="quiztype"), nullable=False
    )
    num_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    difficulty: Mapped[Difficulty] = mapped_column(
        Enum(Difficulty, name="difficulty"),
        nullable=False,
        default=Difficulty.medium,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Chunk tracking for progressive PDF processing
    chunks_total: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    chunks_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    user: Mapped["User"] = relationship(back_populates="quizzes")  # noqa: F821
    questions: Mapped[list["Question"]] = relationship(  # noqa: F821
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="Question.question_number",
    )
    attempts: Mapped[list["QuizAttempt"]] = relationship(  # noqa: F821
        back_populates="quiz", cascade="all, delete-orphan"
    )
