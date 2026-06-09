"""add chunk tracking to quizzes

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-26

"""
from typing import Sequence, Union
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # chunks_total     = how many chunk jobs were dispatched (1 for small PDFs)
    # chunks_completed = how many chunk jobs have finished
    # When chunks_completed == chunks_total, the quiz is fully done.
    op.execute("""
        ALTER TABLE quizzes
        ADD COLUMN chunks_total     INTEGER NOT NULL DEFAULT 1,
        ADD COLUMN chunks_completed INTEGER NOT NULL DEFAULT 0
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE quizzes
        DROP COLUMN IF EXISTS chunks_total,
        DROP COLUMN IF EXISTS chunks_completed
    """)
