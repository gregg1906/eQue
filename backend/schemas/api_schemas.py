from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Literal, Optional
import uuid

# Limity zgodne z kolumnami bazy (models.py) — za długa wartość daje czytelne 422, a nie błąd 500 z bazy (Z5).
# Schematy z panelu admina odrzucają nieznane pola (extra="forbid"). Schematy publiczne używane przez
# aplikację mobilną (JoinQueueRequest, PatientCancelRequest) zostają łagodne wobec dodatkowych pól.
LOGIN_PATTERN = r"^[\w.@-]+$"
STRICT = ConfigDict(extra="forbid")


class KioskStatusResponse(BaseModel):
    """Odpowiedź GET /kiosk/status — heartbeat + stan kolejki dla ekranu kiosku."""
    tablet_id: int
    is_active: bool = True
    location_id: Optional[int] = None
    location_name: Optional[str] = None
    queue_code: Optional[str] = None
    current_ticket_code: Optional[str] = None
    accepting_new_tickets: bool = True


class SignupCodeResponse(BaseModel):
    """
    Odpowiedź GET /kiosk/signup-code — krótkotrwały (30s) kod zapisu, jedyny
    sposób na faktyczne dołączenie do kolejki. Odświeżany cyklicznie przez
    kiosk, żeby stała litera queue_code nie musiała nigdy służyć do zapisu
    (zbyt łatwa do zapamiętania/przekazania dalej bez fizycznej obecności).
    """
    signup_code: str
    expires_in_seconds: int


class JoinQueueRequest(BaseModel):
    """
    Body POST /queue/join — dołączenie do kolejki przez wpisany (lub zeskanowany)
    KOD ZAPISU: krótkotrwały, 4-cyfrowy kod wyświetlany na ekranie kiosku,
    odświeżany co 30s. To NIE stała litera lokalizacji (queue_code) — ta służy
    już tylko jako informacja na kiosku/w ticket_code, nie da się nią dołączyć.
    """
    signup_code: str = Field(max_length=16)
    customer_name: Optional[str] = Field(default=None, max_length=120)
    appointment_time: Optional[str] = Field(default=None, max_length=20)

class JoinQueueResponse(BaseModel):
    """Odpowiedź po dołączeniu do kolejki."""
    ticket_id: str
    ticket_code: str
    queue_position: int
    location_id: int
    estimated_wait_time_minutes: int
    # Ile osób czeka teraz w tej kolejce (razem z tym biletem) — do wskaźnika „pozycja / łącznie” w aplikacji.
    total_in_queue: int | None = None

class ManualTicketRequest(BaseModel):
    """
    Body POST /admin/locations/{id}/tickets — operator dopisuje osobę bez telefonu (F3).
    Ścisły (STRICT): to endpoint panelu, nie aplikacji mobilnej. Puste albo same spacje → bez nazwiska.
    """
    model_config = STRICT
    customer_name: Optional[str] = Field(default=None, max_length=120)

    @field_validator("customer_name")
    @classmethod
    def _strip_name(cls, v: Optional[str]) -> Optional[str]:
        v = v.strip() if v else v
        return v or None

class PatientCancelRequest(BaseModel):
    """
    Body POST /queue/cancel — pacjent samodzielnie anuluje swój bilet.
    `ticket_id` (z odpowiedzi /queue/join) wskazuje bilet jednoznacznie; sam
    `ticket_code` oznacza najnowszy bilet o tym kodzie (kody powtarzają się co dzień).
    """
    ticket_code: Optional[str] = Field(default=None, max_length=10)
    ticket_id: Optional[str] = Field(default=None, max_length=64)

class TicketStatusResponse(BaseModel):
    """
    Odpowiedź GET /queue/ticket/{ticket_code} — publiczny, bezstanowy odczyt
    aktualnego stanu biletu. Aplikacja mobilna dociąga to przy każdym
    (re)połączeniu WS, żeby nigdy nie utknąć na starym stanie, gdyby
    jednorazowy event YOUR_TURN/QUEUE_UPDATE został przegapiony (np. gniazdo
    padło w złym momencie).
    """
    ticket_code: str
    status: str
    queue_position: int
    estimated_wait_time_minutes: int
    total_in_queue: int | None = None


class TicketResponse(BaseModel):
    """Pełna odpowiedź dla pojedynczego biletu."""
    id: str
    ticket_code: str
    status: str
    location_id: int
    joined_at: str
    called_at: Optional[str] = None
    served_at: Optional[str] = None
    customer_name: Optional[str] = None
    appointment_time: Optional[str] = None
    served_by_user_id: Optional[str] = None
    close_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TicketHistoryEntry(TicketResponse):
    """Zakończony bilet w historii zmiany — z imieniem osoby, która go obsłużyła."""
    served_by_name: Optional[str] = None

class ServingTicket(TicketResponse):
    """Wezwany bilet (SERVING) z imieniem operatora, który go wezwał — do listy „Inne stanowiska”."""
    served_by_name: Optional[str] = None


class QueueResponse(BaseModel):
    """Odpowiedź GET /admin/locations/{id}/queue."""
    location_id: int
    waiting: list[TicketResponse]
    # Ostatnio wezwany bilet — zostaje dla zgodności (kiosk, starsza wersja panelu).
    serving: Optional[TicketResponse] = None
    # Wszystkie wezwane bilety, po jednym na operatora (P2), od najdawniej wezwanego.
    serving_all: list[ServingTicket] = []


class TabletCreate(BaseModel):
    """Body POST /admin/tablets."""
    name: str = Field(max_length=100)
    location_id: Optional[int] = None

    model_config = STRICT

class TabletUpdate(BaseModel):
    """Body PUT /admin/tablets/{id} — wszystkie pola opcjonalne."""
    name: Optional[str] = Field(default=None, max_length=100)
    location_id: Optional[int] = None

    model_config = STRICT

class TabletResponse(BaseModel):
    """Odpowiedź dla pojedynczego tabletu."""
    id: int
    name: str
    location_id: Optional[int] = None
    is_active: bool
    last_seen_at: Optional[str] = None
    online: bool = False
    pairing_token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TabletInLocation(BaseModel):
    """Skrócona informacja o tablecie przypisanym do lokalizacji (lub None)."""
    id: int
    name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class LocationCreate(BaseModel):
    """Body POST /admin/locations."""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)
    category: str = Field(default="Ogólna", min_length=1, max_length=100)

    model_config = STRICT

class LocationUpdate(BaseModel):
    """Body PUT /admin/locations/{id} — wszystkie pola opcjonalne."""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=255)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    tablet_id: Optional[int] = None
    user_ids: Optional[list[uuid.UUID]] = Field(default=None, max_length=1000)

    model_config = STRICT

class LocationResponse(BaseModel):
    """Odpowiedź dla pojedynczej lokalizacji."""
    id: int
    name: str
    description: Optional[str] = None
    category: str
    is_active: bool
    queue_code: str
    accepting_new_tickets: bool = True
    tablet: Optional[TabletInLocation] = None
    user_ids: list[uuid.UUID] = []

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    username: str = Field(max_length=50)
    # Limit chroni przed ogromnym ładunkiem; bcrypt i tak widzi tylko 72 bajty (patrz auth.verify_password)
    password: str = Field(max_length=256)

class ChangePasswordRequest(BaseModel):
    """Body POST /auth/change-password — samoobsługowa zmiana własnego hasła."""
    current_password: str = Field(max_length=256)
    new_password: str = Field(max_length=256)

    model_config = STRICT

class PasswordChangedResponse(BaseModel):
    """Odpowiedź POST /auth/change-password. Zmiana hasła unieważnia dotychczasowe tokeny konta,
    więc w odpowiedzi jest świeży token — panel zapisuje go i sesja trwa bez ponownego logowania."""
    message: str
    access_token: str
    token_type: str = "bearer"

class TokenResponse(BaseModel):
    """Odpowiedź POST /auth/login — token + dane profilu potrzebne frontendowi od razu po logowaniu."""
    access_token: str
    token_type: str = "bearer"
    id: uuid.UUID
    role: str
    full_name: str

class MeResponse(BaseModel):
    """Odpowiedź GET /auth/me — aktualnie zalogowany użytkownik."""
    id: uuid.UUID
    username: str
    full_name: str
    role: str
    is_active: bool
    location_ids: list[int]

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    """Body POST /admin/users."""
    username: str = Field(min_length=3, max_length=50, pattern=LOGIN_PATTERN)
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(max_length=256)  # reguły hasła: password_policy.py
    role: str = Field(default="OPERATOR", max_length=20)
    position: Optional[str] = Field(default=None, max_length=120)
    location_ids: list[int] = Field(default=[], max_length=1000)

    model_config = STRICT

class UserUpdate(BaseModel):
    """Body PUT /admin/users/{id} — wszystkie pola opcjonalne."""
    username: Optional[str] = Field(default=None, min_length=3, max_length=50, pattern=LOGIN_PATTERN)
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    position: Optional[str] = Field(default=None, max_length=120)
    role: Optional[str] = Field(default=None, max_length=20)
    password: Optional[str] = Field(default=None, max_length=256)
    location_ids: Optional[list[int]] = Field(default=None, max_length=1000)

    model_config = STRICT

class UserResponse(BaseModel):
    """Odpowiedź dla pojedynczego użytkownika (lista i szczegóły)."""
    id: uuid.UUID
    username: str
    full_name: str
    position: Optional[str] = None
    role: str
    is_active: bool
    location_ids: list[int] = []
    online: bool = False

    model_config = ConfigDict(from_attributes=True)


CloseReason = Literal["NO_SHOW", "PATIENT_CANCELLED", "STAFF_CANCELLED"]


class UserPreferences(BaseModel):
    """
    Ustawienia panelu zapisane na koncie użytkownika (kolumna users.preferences),
    dzięki czemu działają na każdym komputerze, a nie tylko w jednej przeglądarce.
    Wartości domyślne = zachowanie panelu sprzed wprowadzenia ustawień.
    """
    theme: Literal["light", "dark", "system"] = "light"
    text_size: Literal["normal", "large", "xlarge"] = "normal"
    high_contrast: bool = False
    reduce_motion: bool = False
    # WCAG 2.2.1 — użytkownik może wydłużyć czas na „Cofnij”
    undo_seconds: Literal[6, 10, 20, 60] = 6
    sound_on_new_ticket: bool = False
    default_location_id: Optional[int] = None
    # WCAG 2.1.4 — skróty jednoklawiszowe muszą dać się wyłączyć
    single_key_shortcuts: bool = True


class UserPreferencesUpdate(BaseModel):
    """Body PUT /auth/me/preferences — zmienia tylko przesłane pola."""
    theme: Optional[Literal["light", "dark", "system"]] = None
    text_size: Optional[Literal["normal", "large", "xlarge"]] = None
    high_contrast: Optional[bool] = None
    reduce_motion: Optional[bool] = None
    undo_seconds: Optional[Literal[6, 10, 20, 60]] = None
    sound_on_new_ticket: Optional[bool] = None
    default_location_id: Optional[int] = None
    single_key_shortcuts: Optional[bool] = None

    model_config = ConfigDict(extra="forbid")
