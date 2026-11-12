"""ticket_service_date

Revision ID: b7d3e1f4a2c8
Revises: 9e2c4b7a1f30
Create Date: 2026-11-12 10:00:00.000000

- tickets.service_date — dzień placówki (czas lokalny, APP_TIMEZONE), do którego
  należy numeracja biletu. Wcześniej „dzień” liczono w UTC, więc w Polsce numeracja
  zaczynała się od nowa o 1:00 albo 2:00 zamiast o północy.
- UNIQUE (location_id, service_date, ticket_code) — dwa jednoczesne zapisy nie mogą
  już dostać tego samego kodu.

Istniejące bilety dostają service_date z joined_at. Jeśli w starych danych ten sam kod
wystąpił dwa razy tego samego dnia (właśnie przez opisany wyścig), takie wiersze
zostają z NULL — ograniczenie UNIQUE nie obejmuje wartości NULL, więc migracja
nie zatrzyma się na historycznych duplikatach.
"""
import os
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7d3e1f4a2c8'
down_revision: Union[str, Sequence[str], None] = '9e2c4b7a1f30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tickets', sa.Column('service_date', sa.Date(), nullable=True))

    tz = os.getenv("APP_TIMEZONE", "Europe/Warsaw")
    op.execute(sa.text("""
        UPDATE tickets t
        SET service_date = (t.joined_at AT TIME ZONE :tz)::date
        WHERE NOT EXISTS (
            SELECT 1 FROM tickets o
            WHERE o.id <> t.id
              AND o.location_id = t.location_id
              AND o.ticket_code = t.ticket_code
              AND (o.joined_at AT TIME ZONE :tz)::date = (t.joined_at AT TIME ZONE :tz)::date
        )
    """).bindparams(tz=tz))

    op.create_unique_constraint(
        'uq_tickets_location_day_code', 'tickets', ['location_id', 'service_date', 'ticket_code']
    )


def downgrade() -> None:
    op.drop_constraint('uq_tickets_location_day_code', 'tickets', type_='unique')
    op.drop_column('tickets', 'service_date')
