import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


# TABELA 1: Konta adminów

class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))



# TABELA 2: Punkty obsługi (np. "Okienko 3", "Rejestracja")

class ServicePoint(Base):
    __tablename__ = "service_points"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))           # np. "Okienko 3"
    category: Mapped[str] = mapped_column(String(100))       # np. "Rejestracja Ogólna"
    is_active: Mapped[bool] = mapped_column(default=True)

    # Relacje (Jeden punkt obsługi ma wiele tabletów i wiele biletów)
    tablets: Mapped[list["Tablet"]] = relationship(back_populates="service_point")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="service_point")



# TABELA 3: Tablety / Kioski

class Tablet(Base):
    __tablename__ = "tablets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))           # np. "Tablet Wejściowy"
    location: Mapped[str] = mapped_column(String(200))       # np. "Hol Główny"
    
    # Klucz obcy - do jakiego okienka jest przypisany tablet (NULL dla wejściowego)
    service_point_id: Mapped[int | None] = mapped_column(ForeignKey("service_points.id"))
    
    # Relacja zwrotna
    service_point: Mapped["ServicePoint"] = relationship(back_populates="tablets")




# TABELA 4: Pacjenci w kolejce (bilety)

class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    ticket_code: Mapped[str] = mapped_column(String(10), index=True)  # Krótki kod 
    
    # Statusy: WAITING, SERVING, COMPLETED, CANCELLED
    status: Mapped[str] = mapped_column(String(20), default="WAITING") 
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Klucz obcy - w jakim okienku czeka pacjent
    service_point_id: Mapped[int] = mapped_column(ForeignKey("service_points.id"))
    
    # Relacja zwrotna
    service_point: Mapped["ServicePoint"] = relationship(back_populates="tickets")