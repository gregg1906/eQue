import uuid
from datetime import date, datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, Date, Boolean, Table, Column, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from clock import local_today


user_locations = Table(
    "user_locations",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("location_id", ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    position: Mapped[str | None] = mapped_column(String(120), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="OPERATOR")
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Ustawienia panelu zapisane na koncie (schemat: schemas.api_schemas.UserPreferences).
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}")

    locations: Mapped[list["Location"]] = relationship(
        secondary=user_locations, back_populates="users"
    )
    # passive_deletes="all": ORM nie zeruje served_by_user_id przy usuwaniu konta —
    # klucz obcy bez ON DELETE odrzuci wtedy usunięcie, zamiast po cichu wymazać z historii,
    # kto obsłużył bilety (delete_user zwraca wcześniej czytelne 409).
    served_tickets: Mapped[list["Ticket"]] = relationship(back_populates="served_by_user", passive_deletes="all")


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    queue_code: Mapped[str] = mapped_column(String(2), unique=True)
    accepting_new_tickets: Mapped[bool] = mapped_column(Boolean, default=True)

    tablets: Mapped[list["Tablet"]] = relationship(back_populates="location")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="location")
    users: Mapped[list["User"]] = relationship(
        secondary=user_locations, back_populates="locations"
    )


class Tablet(Base):
    __tablename__ = "tablets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))

    location_id: Mapped[int | None] = mapped_column(
        ForeignKey("locations.id"), nullable=True, unique=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    pairing_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    paired_device_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    location: Mapped["Location | None"] = relationship(back_populates="tablets")


def _service_date_default(context) -> date:
    """Dzień placówki, w którym wydano bilet — liczony z joined_at w strefie APP_TIMEZONE."""
    joined = context.get_current_parameters().get("joined_at")
    if isinstance(joined, datetime) and joined.tzinfo is None:
        joined = joined.replace(tzinfo=timezone.utc)
    return local_today(joined if isinstance(joined, datetime) else None)


class Ticket(Base):
    __tablename__ = "tickets"
    # Kod biletu (A01, A02…) jest unikalny w obrębie lokalizacji i dnia placówki —
    # baza odrzuci duplikat nawet wtedy, gdyby blokada w join_queue zawiodła.
    __table_args__ = (
        UniqueConstraint("location_id", "service_date", "ticket_code", name="uq_tickets_location_day_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_code: Mapped[str] = mapped_column(String(10), index=True)

    status: Mapped[str] = mapped_column(String(20), default="WAITING")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    called_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    served_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Dzień placówki (czas lokalny), do którego należy numeracja biletu. NULL tylko
    # dla starych biletów, których nie dało się jednoznacznie przypisać (zob. migracja).
    service_date: Mapped[date | None] = mapped_column(Date, nullable=True, default=_service_date_default)

    customer_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    appointment_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Tylko dla status=CANCELLED: NO_SHOW / PATIENT_CANCELLED / STAFF_CANCELLED.
    close_reason: Mapped[str | None] = mapped_column(String(20), nullable=True)

    served_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"))

    location: Mapped["Location"] = relationship(back_populates="tickets")
    served_by_user: Mapped["User | None"] = relationship(back_populates="served_tickets")