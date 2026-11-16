import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import SessionLocal

# Klucz podpisu tokenów pochodzi wyłącznie ze zmiennej JWT_SECRET_KEY (min. 32 bajty).
# Bez niej backend nie startuje. Jedyny wyjątek: jawnie włączony tryb deweloperski (APP_ENV=dev),
# w którym używany jest klucz zastępczy — nigdy na serwerze dostępnym z sieci.
APP_ENV = os.getenv("APP_ENV", "").strip().lower()
MIN_SECRET_BYTES = 32
_DEV_SECRET_KEY = "klucz-tylko-dla-trybu-dev-nie-uzywac-na-serwerze"


def _load_secret_key() -> str:
    key = os.getenv("JWT_SECRET_KEY", "")
    if len(key.encode("utf-8")) >= MIN_SECRET_BYTES:
        return key
    if APP_ENV == "dev":
        logging.getLogger("eque.auth").warning(
            "APP_ENV=dev: JWT_SECRET_KEY jest pusty lub za krótki — używam klucza deweloperskiego."
        )
        return _DEV_SECRET_KEY
    raise RuntimeError(
        f"JWT_SECRET_KEY musi mieć co najmniej {MIN_SECRET_BYTES} bajtów. Wygeneruj go poleceniem: "
        "python -c \"import secrets; print(secrets.token_urlsafe(48))\" i wpisz do pliku .env "
        "(do lokalnych testów można ustawić APP_ENV=dev)."
    )


SECRET_KEY = _load_secret_key()
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
    encoded = plain_password.encode("utf-8")
    if len(encoded) > 72:
        # bcrypt 5 rzuca wyjątek dla haseł dłuższych niż 72 bajty; takiego hasła nie dało się ustawić
        return False
    return bcrypt.checkpw(encoded, hashed_password.encode("utf-8"))


def hash_password(plain_password: str) -> str:
    """Hashuje hasło bcryptem (do tworzenia/aktualizacji użytkownika)."""
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(user) -> str:
    """
    Wydaje token JWT dla konta. Zawiera identyfikator konta (sub — nie login, więc zmiana loginu
    nie zrywa ani nie przenosi tokenu), wersję tokenów konta (ver) i unikalny identyfikator
    tokenu (jti), po którym można go unieważnić przy wylogowaniu.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # iat pozwala panelowi policzyć czas życia tokena i odnowić go w połowie, bez zgadywania
    payload = {
        "sub": str(user.id),
        "ver": user.token_version,
        "jti": uuid.uuid4().hex,
        "exp": expire,
        "iat": now,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def bump_token_version(user) -> None:
    """Unieważnia wszystkie dotychczasowe tokeny konta. Wywołujący robi commit."""
    user.token_version = (user.token_version or 0) + 1


def _revoked_key(jti: str) -> str:
    return f"revoked_jti:{jti}"


async def revoke_token(redis_client, token: str) -> None:
    """Wpisuje jti tokenu na listę unieważnionych w Redisie do czasu jego wygaśnięcia (wylogowanie)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return  # i tak nie działa
    jti = payload.get("jti")
    if not jti:
        return
    ttl = max(1, int(payload.get("exp", 0) - datetime.now(timezone.utc).timestamp()))
    await redis_client.set(_revoked_key(jti), "1", ex=ttl)


class TokenError(Exception):
    """Token nie uwierzytelnia. inactive=True: konto istnieje, ale jest wyłączone (WS: kod 4003)."""

    def __init__(self, detail: str, inactive: bool = False):
        super().__init__(detail)
        self.detail = detail
        self.inactive = inactive


async def authenticate_token(token: str, db: Session, redis_client):
    """
    Wspólna weryfikacja tokenu dla REST (get_current_user) i WebSocketu (połączenie oraz każdy ping):
    podpis i ważność, konto istnieje i jest aktywne, wersja tokenów zgadza się z kontem,
    jti nie został unieważniony przy wylogowaniu. Zwraca User albo rzuca TokenError.
    """
    import models

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise TokenError("Token wygasł — zaloguj się ponownie")
    except jwt.PyJWTError:
        raise TokenError("Nieprawidłowy lub wygasły token")

    try:
        user_id = uuid.UUID(str(payload.get("sub")))
    except ValueError:
        # m.in. stare tokeny z loginem w polu sub — po wdrożeniu trzeba zalogować się ponownie
        raise TokenError("Nieprawidłowy lub wygasły token")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise TokenError("Nieprawidłowy lub wygasły token")
    if not user.is_active:
        # REST: 401, a nie 403 — token przestał uwierzytelniać, więc panel ma zakończyć sesję.
        raise TokenError("Konto użytkownika jest nieaktywne", inactive=True)
    if payload.get("ver") != user.token_version:
        raise TokenError("Sesja została unieważniona — zaloguj się ponownie")
    jti = payload.get("jti")
    if not jti or await redis_client.exists(_revoked_key(jti)):
        raise TokenError("Sesja została zakończona — zaloguj się ponownie")
    return user


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    """
    Dependency FastAPI: weryfikuje token JWT z nagłówka Authorization: Bearer <token>
    i zwraca obiekt User z bazy. Rzuca 401 jeśli token jest nieważny, unieważniony
    albo użytkownik nieaktywny.
    """
    try:
        return await authenticate_token(credentials.credentials, db, request.app.state.redis)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


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
