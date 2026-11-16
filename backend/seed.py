"""
seed.py — pierwsze konto administratora i (opcjonalnie) dane demonstracyjne.

Uruchamianie:
    python seed.py

Zmienne środowiskowe:
    ADMIN_INITIAL_PASSWORD  hasło pierwszego administratora (login: ADMIN_INITIAL_USERNAME, domyślnie "admin");
                            musi spełniać politykę haseł (password_policy.py)
    SEED_DEMO_DATA=1        dodatkowo konta operatorów, lokalizacje, tablety i bilety testowe
                            (tylko do rozwoju i pokazów — domyślnie wyłączone)

Skrypt jest idempotentny: jeśli tabela users już zawiera dane, kończy bez zmian. Bez żadnej
ze zmiennych na pustej bazie nie powstaje żadne konto.
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from database import SessionLocal
from models import User, Location, Tablet, Ticket
from auth import hash_password
from password_policy import validate_password

DEMO_ADMIN_PASSWORD = "admin123"  # tylko przy SEED_DEMO_DATA=1 i bez ADMIN_INITIAL_PASSWORD


def seed_data():
    demo = os.getenv("SEED_DEMO_DATA", "") == "1"
    admin_username = os.getenv("ADMIN_INITIAL_USERNAME", "admin").strip() or "admin"
    admin_password = os.getenv("ADMIN_INITIAL_PASSWORD", "")

    db = SessionLocal()

    if db.query(User).first():
        print("Baza już zawiera dane. Pomijam seeding.")
        db.close()
        return

    if not demo and not admin_password:
        print("Pusta baza i brak ADMIN_INITIAL_PASSWORD ani SEED_DEMO_DATA=1 — nie tworzę żadnego konta.")
        print("Ustaw ADMIN_INITIAL_PASSWORD w pliku .env i uruchom ponownie.")
        db.close()
        return

    if admin_password:
        error = validate_password(admin_password, admin_username)
        if error:
            db.close()
            sys.exit(f"ADMIN_INITIAL_PASSWORD odrzucone: {error}")
    else:
        admin_password = DEMO_ADMIN_PASSWORD

    admin = User(
        username=admin_username,
        full_name="Administrator Systemu",
        role="ADMIN",
        password_hash=hash_password(admin_password),
        is_active=True,
    )

    if not demo:
        db.add(admin)
        db.commit()
        db.close()
        print(f"Utworzono konto administratora '{admin_username}'.")
        return

    print("Zasilanie bazy danymi demonstracyjnymi (SEED_DEMO_DATA=1)...")

    op1 = User(
        username="jan.kowalski",
        full_name="Jan Kowalski",
        position="Recepcjonista",
        role="OPERATOR",
        password_hash=hash_password("operator123"),
        is_active=True,
    )

    op2 = User(
        username="anna.nowak",
        full_name="Anna Nowak",
        position="Pielęgniarka",
        role="OPERATOR",
        password_hash=hash_password("operator123"),
        is_active=True,
    )

    db.add_all([admin, op1, op2])
    db.commit()


    loc1 = Location(
        name="Rejestracja Ogólna",
        description="Główna rejestracja przy wejściu",
        category="Rejestracja",
        is_active=True,
        queue_code="A",
    )

    loc2 = Location(
        name="Gabinet Kardiologiczny",
        description="Piętro 2, pokój 214",
        category="Kardiologia",
        is_active=True,
        queue_code="B",
    )

    db.add_all([loc1, loc2])
    db.commit()


    op1.locations = [loc1]
    op2.locations = [loc1, loc2]
    db.commit()


    tab1 = Tablet(
        name="Kiosk Rejestracja",
        location_id=loc1.id,
        is_active=True,
        pairing_token="DEV1-TAB1",
    )

    tab2 = Tablet(
        name="Kiosk Kardiologia",
        location_id=loc2.id,
        is_active=True,
        pairing_token="DEV2-TAB2",
    )

    db.add_all([tab1, tab2])
    db.commit()


    now = datetime.now(timezone.utc)

    tickets_loc1 = [
        Ticket(
            ticket_code="A01",
            status="SERVING",
            location_id=loc1.id,
            joined_at=now - timedelta(minutes=35),
            called_at=now - timedelta(minutes=2),
            served_by_user_id=op1.id,
        ),
        Ticket(
            ticket_code="A02",
            status="WAITING",
            location_id=loc1.id,
            joined_at=now - timedelta(minutes=25),
        ),
        Ticket(
            ticket_code="A03",
            status="WAITING",
            location_id=loc1.id,
            joined_at=now - timedelta(minutes=15),
        ),
        Ticket(
            ticket_code="A04",
            status="WAITING",
            location_id=loc1.id,
            joined_at=now - timedelta(minutes=5),
            appointment_time="10:30",
        ),
    ]

    tickets_loc2 = [
        Ticket(
            ticket_code="B01",
            status="WAITING",
            location_id=loc2.id,
            joined_at=now - timedelta(minutes=40),
            appointment_time="09:45",
        ),
        Ticket(
            ticket_code="B02",
            status="WAITING",
            location_id=loc2.id,
            joined_at=now - timedelta(minutes=20),
        ),
    ]

    db.add_all(tickets_loc1 + tickets_loc2)
    print(f"   📍 Lokalizacja 1: Rejestracja Ogólna  (ID: {loc1.id})")
    print(f"   📍 Lokalizacja 2: Gabinet Kardiologiczny (ID: {loc2.id})")
    print(f"   📱 Tablet 1: Kiosk Rejestracja  → loc {loc1.id}")
    print(f"   📱 Tablet 2: Kiosk Kardiologia → loc {loc2.id}")
    db.commit()
    db.close()

    print("✅ Seeding zakończony! Dane testowe:")
    print(f"   👤 Admin:     {admin_username} (hasło z ADMIN_INITIAL_PASSWORD albo demonstracyjne z README)")
    print(f"   👤 Operator1: jan.kowalski / operator123  → Rejestracja Ogólna")
    print(f"   👤 Operator2: anna.nowak / operator123    → Rejestracja Ogólna + Kardiologia")
    print(f"   🎫 Bilety loc1: 3×WAITING + 1×SERVING")
    print(f"   🎫 Bilety loc2: 2×WAITING")


if __name__ == "__main__":
    seed_data()
