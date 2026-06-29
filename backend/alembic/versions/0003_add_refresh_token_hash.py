"""add refresh_token_hash to users

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-10

"""
from typing import Sequence, Union
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE users
        ADD COLUMN refresh_token_hash VARCHAR(64) NULL
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE users
        DROP COLUMN IF EXISTS refresh_token_hash
    """)
