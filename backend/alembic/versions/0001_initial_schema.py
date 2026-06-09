"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-25

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # ── Enums ──────────────────────────────────────────────────────────
    op.execute("CREATE TYPE sourcetype  AS ENUM ('pdf', 'text', 'topic')")
    op.execute("CREATE TYPE quizstatus  AS ENUM ('pending', 'processing', 'completed', 'failed')")
    op.execute("CREATE TYPE quiztype    AS ENUM ('mcq', 'true_false', 'short_answer', 'mixed')")
    op.execute("CREATE TYPE difficulty  AS ENUM ('easy', 'medium', 'hard')")
    op.execute("CREATE TYPE questiontype AS ENUM ('mcq', 'true_false', 'short_answer')")

    # ── users ──────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE users (
            id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email            VARCHAR(255) NOT NULL UNIQUE,
            hashed_password  VARCHAR(255) NOT NULL,
            full_name        VARCHAR(255) NOT NULL,
            is_active        BOOLEAN NOT NULL DEFAULT true,
            created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_users_email ON users (email)")

    # ── quizzes ────────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE quizzes (
            id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title            VARCHAR(500) NOT NULL,
            source_type      sourcetype NOT NULL,
            source_content   TEXT,
            file_path        VARCHAR(1000),
            status           quizstatus NOT NULL DEFAULT 'pending',
            quiz_type        quiztype NOT NULL,
            num_questions    INTEGER NOT NULL DEFAULT 10,
            difficulty       difficulty NOT NULL DEFAULT 'medium',
            error_message    TEXT,
            created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            completed_at     TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX ix_quizzes_user_id        ON quizzes (user_id)")
    op.execute("CREATE INDEX ix_quizzes_status         ON quizzes (status)")
    op.execute("CREATE INDEX ix_quizzes_user_id_status ON quizzes (user_id, status)")

    # ── questions ──────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE questions (
            id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            quiz_id          UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            question_number  INTEGER NOT NULL,
            question_type    questiontype NOT NULL,
            question_text    TEXT NOT NULL,
            options          JSONB,
            correct_answer   TEXT NOT NULL,
            explanation      TEXT NOT NULL
        )
    """)
    op.execute("CREATE INDEX ix_questions_quiz_id ON questions (quiz_id)")

    # ── quiz_attempts ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE quiz_attempts (
            id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            quiz_id       UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
            answers       JSONB NOT NULL DEFAULT '{}',
            score         FLOAT,
            completed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX ix_quiz_attempts_quiz_id ON quiz_attempts (quiz_id)")
    op.execute("CREATE INDEX ix_quiz_attempts_user_id ON quiz_attempts (user_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS quiz_attempts")
    op.execute("DROP TABLE IF EXISTS questions")
    op.execute("DROP TABLE IF EXISTS quizzes")
    op.execute("DROP TABLE IF EXISTS users")
    op.execute("DROP TYPE IF EXISTS questiontype")
    op.execute("DROP TYPE IF EXISTS difficulty")
    op.execute("DROP TYPE IF EXISTS quiztype")
    op.execute("DROP TYPE IF EXISTS quizstatus")
    op.execute("DROP TYPE IF EXISTS sourcetype")
