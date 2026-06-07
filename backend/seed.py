import bcrypt
from database import SessionLocal
from models import Admin, ServicePoint, Tablet, Ticket

def hash_password(password: str) -> str:
    """Szyfruje hasło używając bezpośrednio nowoczesnego bcrypt."""
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_bytes.decode('utf-8')

def seed_data():
    db = SessionLocal()
    
    if db.query(Admin).first():
        print("Baza już posiada dane. Pomijam seeding.")
        db.close()
        return

    print("Zasilanie bazy danych (Seeding)...")

    # 1. Tworzymy Superadmina z nowym mechanizmem szyfrowania
    hashed_password = hash_password("admin123")
    admin = Admin(username="admin", password_hash=hashed_password)
    db.add(admin)

    # 2. Tworzymy Punkty Obsługi
    sp1 = ServicePoint(name="Okienko 1", category="Rejestracja Ogólna")
    sp2 = ServicePoint(name="Okienko 3", category="Rejestracja Ogólna")
    sp3 = ServicePoint(name="Gabinet Kardiologiczny", category="Kardiologia")
    
    db.add_all([sp1, sp2, sp3])
    db.commit()

    # 3. Tworzymy Tablety
    tab1 = Tablet(name="Tablet Wejściowy", location="Hol Główny", service_point_id=None)
    tab2 = Tablet(name="Tablet Rejestracja", location="Okienko 1", service_point_id=sp1.id)
    tab3 = Tablet(name="Kiosk Kardiologia", location="Piętro 2", service_point_id=sp3.id)
    db.add_all([tab1, tab2, tab3])

    # 4. Tworzymy testowych pacjentów w kolejce
    ticket1 = Ticket(ticket_code="GCH", service_point_id=sp2.id, status="WAITING")
    ticket2 = Ticket(ticket_code="A12", service_point_id=sp1.id, status="WAITING")
    db.add_all([ticket1, ticket2])

    db.commit()
    db.close()
    print("Zakończono! Baza jest gotowa do testów z frontendem.")

if __name__ == "__main__":
    seed_data()