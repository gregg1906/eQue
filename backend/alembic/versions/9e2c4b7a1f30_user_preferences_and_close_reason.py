"""user_preferences_and_close_reason

Revision ID: 9e2c4b7a1f30
Revises: 40510a9d8801
Create Date: 2026-11-11 22:30:00.000000

- users.preferences — ustawienia panelu zapisane na koncie (motyw, rozmiar tekstu,
  kontrast, okno „Cofnij”, dźwięk…), zamiast w localStorage jednej przeglądarki.
- tickets.close_reason — powód zamknięcia anulowanego biletu (NO_SHOW,
  PATIENT_CANCELLED, STAFF_CANCELLED). Status zostaje CANCELLED, bo aplikacja
  mobilna rozpoznaje koniec biletu tylko po COMPLETED/CANCELLED.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9e2c4b7a1f30'
down_revision: Union[str, Sequence[str], None] = '40510a9d8801'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column('preferences', postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.add_column('tickets', sa.Column('close_reason', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tickets', 'close_reason')
    op.drop_column('users', 'preferences')
