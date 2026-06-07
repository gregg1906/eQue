import bcrypt
import jwt
from datetime import datetime, timedelta, timezone

# Klucz prywatny serwera
# Tylko ten serwer potrafi wystawić i zweryfikować token za pomocą tego klucza.
SECRET_KEY = "super-sekretny-klucz-kolejki"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120 # Token wygasa po 2 godzinach

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Sprawdza czy hasło z Reacta pasuje do hasha w bazie."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict) -> str:
    """Generuje nowy token JWT (opaskę VIP)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Dodajemy datę wygaśnięcia do zawartości tokena
    to_encode.update({"exp": expire})
    
    # Szyfrujemy i zwracamy jako tekst
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt