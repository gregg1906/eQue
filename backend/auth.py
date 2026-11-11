import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import SessionLocal

# W produkcji klucz MUSI przyjść ze zmiennej środowiskowej — wartość domyślna jest tylko dla środowiska deweloperskiego.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-sekretny-klucz-kolejki")
ALGORITHM = "HS256"
# Czas życia tokena = limit bezczynności. Aktywny użytkownik odnawia token (POST /auth/refresh)
# przed wygaśnięciem, więc sesja trwa całą zmianę, a porzucony komputer wylogowuje się sam.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

ROLE_ADMIN = "ADMIN"
ROLE_OPERATOR = "OPERATOR"
VALID_ROLES = {ROLE_ADMIN, ROLE_OPERATOR}

bearer_scheme = HTTPBearer()


def get_db():
    """Generator sesji bazy danych."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Sprawdza czy hasło z Reacta pasuje do hasha w bazie."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def hash_password(plain_password: str) -> str:
    """Hashuje hasło bcryptem (do tworzenia/aktualizacji użytkownika)."""
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict) -> str:
    """Generuje nowy token JWT."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # iat pozwala panelowi policzyć czas życia tokena i odnowić go w połowie, bez zgadywania
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    Dependency FastAPI: weryfikuje token JWT z nagłówka Authorization: Bearer <token>
    i zwraca obiekt User z bazy. Rzuca 401 jeśli token jest nieważny lub użytkownik nieaktywny.
    """
    import models

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Nieprawidłowy lub wygasły token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token wygasł — zaloguj się ponownie",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        # 401, a nie 403: token przestał uwierzytelniać (admin wyłączył konto w trakcie sesji),
        # więc panel ma zakończyć sesję. 403 zostaje dla „zalogowany, ale bez uprawnień”.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Konto użytkownika jest nieaktywne",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(current_user=Depends(get_current_user)):
    """
    Dependency FastAPI: przepuszcza tylko administratora. Ukrycie zakładek w panelu
    to wyłącznie wygoda — o uprawnieniach decyduje backend, bo token operatora
    można wykorzystać bezpośrednio (curl, Swagger) z pominięciem interfejsu.
    """
    if current_user.role != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ta operacja wymaga uprawnień administratora",
        )
    return current_user


def ensure_location_access(user, location_id: int) -> None:
    """
    Operator może działać tylko na kolejkach lokalizacji, do których jest przypisany
    (tabela user_locations). Administrator ma dostęp do wszystkich lokalizacji.
    """
    if user.role == ROLE_ADMIN:
        return
    if location_id not in {loc.id for loc in user.locations}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nie masz dostępu do tej lokalizacji",
        )
