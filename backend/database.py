from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# 1. Adres URL do bazy zdefiniowanej w docker-compose
# postgresql://user:hasło@host:port/nazwa_bazy
SQLALCHEMY_DATABASE_URL = "postgresql://admin:jebaccity@localhost:5432/eque_db"

# 2. Silnik do zarządzania połączeniem z bazą
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 3. Generator sesji
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Klasa bazowa
class Base(DeclarativeBase):
    pass