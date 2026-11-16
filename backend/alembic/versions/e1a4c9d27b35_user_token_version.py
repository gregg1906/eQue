"""users.token_version — unieważnianie tokenów JWT (Z3)

Revision ID: e1a4c9d27b35
Revises: b7d3e1f4a2c8
Create Date: 2026-11-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e1a4c9d27b35'
down_revision: Union[str, Sequence[str], None] = 'b7d3e1f4a2c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('token_version', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    op.drop_column('users', 'token_version')
