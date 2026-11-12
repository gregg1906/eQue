# eQue — specyfikacja API, modelu danych i WebSocketu

Dokument dla osoby ogarniającej backend. Cel: zastąpić realnym API wszystko, co
panel admina (`web/`) na razie trzyma w `localStorage` i symuluje w JS
(statusy online/offline, "aktualny kod" na tablecie, obecność operatorów,
logowanie operatorów). Poniżej: co już jest w `backend/`, co trzeba dobudować,
gdzie obecny model danych nie pasuje do tego, co robi frontend, oraz projekt
WebSocketu.

Konwencje nazewnictwa trzymam zgodnie z tym, co już jest w kodzie
(`models.py` używa `is_active`, `snake_case`, SQLAlchemy `Mapped[...]`).

---

## 1. Stan obecny — co już działa

Stack: FastAPI + PostgreSQL (SQLAlchemy + Alembic) + JWT (PyJWT/bcrypt).
Redis jest w `docker-compose.yml` i `requirements.txt`, ale **nic go jeszcze
nie używa** — to się przyda pod WebSocket (patrz sekcja 6).

Tabele: `admins` (id, username, password_hash), `service_points` (id, name,
category, is_active), `tablets` (id, name, location, service_point_id),
`tickets` (id, ticket_code, status, joined_at, service_point_id).

Endpointy: `POST /api/v1/auth/login` (działa, tylko dla admina),
`GET /api/v1/kiosk/status`, `GET /api/v1/kiosk/signup-code`, `POST /api/v1/queue/join`
(wszystkie wdrożone — patrz sekcja 4),
CRUD `GET/POST/PUT/DELETE /api/v1/admin/tablets` (działa na realnej bazie).

**Uwaga historyczna:** ta sekcja opisywała stan projektu sprzed refaktoryzacji
z sekcji 2-4 (parowanie QR, `service_points`, `admins`) — większość z tego
zostało już wdrożone zgodnie z rekomendacjami poniżej; traktuj resztę
dokumentu (sekcje 2-8) jako źródło prawdy o bieżącym modelu i endpointach.

**Ważne, zanim ktokolwiek zacznie kodować:** żaden endpoint `/api/v1/admin/*`
nie jest dziś niczym chroniony — `verify_password`/`create_access_token`
istnieją, ale nie ma `Depends(get_current_user)` na trasach. To trzeba
domknąć równolegle z resztą, bo inaczej cały panel admina zostaje otwarty
bez tokena.

---

## 2. Rozbieżności między backendem a frontendem (decyzje do podjęcia)

1. **`admins` vs koncepcja "Użytkownicy" z frontendu.** Zakładka Użytkownicy
   w panelu trzyma jedną listę osób z polem roli (`Operator` / `Admin`) —
   admin to po prostu wpis z inną rolą, nie osobna tabela. Rekomendacja:
   `admins` → zastąpić jedną tabelą `users` z `role` (`ADMIN`/`OPERATOR`).
   Trzeba przenieść istniejący wpis bootstrapowego admina (seed: `admin` /
   `admin123`) do nowej tabeli.

2. **Operatorzy w ogóle nie mają dziś backendu.** Frontend loguje operatora
   sprawdzając hasło w plaintext w `localStorage` po stronie klienta
   (`LoginForm.tsx`) — to czysta atrapa, zero bezpieczeństwa. Po zmianie z
   pkt. 1 login powinien sprawdzać jedną tabelę `users` niezależnie od roli.

3. **Niespójny "login".** Dziś admin loguje się przez osobne pole
   `username` ("admin"), a operator przez swoje **imię i nazwisko**
   (`fullName`). Rekomendacja: każdy `user` dostaje własne pole `username`
   (ustawiane przy tworzeniu konta, niezależne od `full_name`) — spójne dla
   obu ról i nie psuje się przy zmianie wyświetlanego imienia.

4. **`tablets.location` (tekst) vs `service_point_id` (FK) — realna
   kolizja.** W `seed.py` tablet wejściowy ma `location="Hol Główny"` i
   `service_point_id=None`, czyli "Hol Główny" jako lokalizacja **nie
   istnieje** jako osobny `service_point`. Frontend tak nie działa — w
   panelu "Hol Główny" jest pełnoprawną lokalizacją (`loc1`), do której
   przypisany jest tablet, i cała logika kaskadowej dezaktywacji (patrz
   pkt. niżej) opiera się na jednej relacji FK, nie na dwóch równoległych
   polach. Rekomendacja: **usunąć `tablets.location` (string)**, a każde
   miejsce — łącznie z holem/wejściem — modelować jako realny rekord w
   `locations` (nawet bez aktywnej kolejki, np. `category="Informacja"`).
   Jedno źródło prawdy: `tablets.location_id`.

5. **`tablets` nie ma `is_active`.** Potrzebne pod dezaktywację tabletu
   (patrz sekcja 4).

6. **Nazwy statusów ticketu.** Backend ma `WAITING/SERVING/COMPLETED/CANCELLED`,
   frontendowy mockup (`UserQueue.tsx`) myślał w kategoriach
   waiting/serving/served/skipped. To tylko nazewnictwo — **zostawić
   istniejące wartości w bazie**, frontend zmapuje `COMPLETED → "served"`,
   `CANCELLED → "skipped"` u siebie. Nie ma potrzeby ruszać enuma w DB.

7. **Reguła "1 tablet = max 1 lokalizacja"** jest dziś pilnowana tylko w JS
   (frontend automatycznie odłącza poprzedni tablet przy ponownym
   przypisaniu). Backend powinien to wymusić też na poziomie bazy:
   `UNIQUE` na `tablets.location_id` (Postgres pozwala na wiele wartości
   `NULL` przy `UNIQUE`, więc wiele nieprzypisanych tabletów nie koliduje).

---

## 3. Model danych — docelowy

Legenda: 🆕 nowa tabela, 🔧 zmiana istniejącej, ✅ bez zmian.

### 🔧 `locations` (dziś `service_points`, rekomenduję też zmianę nazwy tabeli/klasy na `Location`, żeby nazewnictwo 1:1 odpowiadało zakładce "Lokalizacje")

| pole | typ | uwagi |
|---|---|---|
| `id` | int, PK | bez zmian |
| `name` | String(100) | bez zmian |
| `description` | String(255), nullable | **nowe** — frontend ma to pole (`AdminLocations.tsx`), dziś go nie ma |
| `category` | String(100) | zostaje, frontend go nie używa, ale niech będzie na przyszłość |
| `is_active` | bool, default `True` | bez zmian — używane przy dezaktywacji |
| `queue_code` | String(2), unique | **wdrożone** — stała litera kolejki (np. "A"), nadawana automatycznie (pierwsza wolna A-Z) przy tworzeniu lokalizacji. **Nie służy do dołączania do kolejki** — jest tylko informacją na ekranie kiosku i prefiksem `ticket_code` (np. "A01"). Do zapisu służy wyłącznie krótkotrwały kod zapisu (`signup_code`, patrz sekcja 4, "Kiosk"), bo stałą literę zbyt łatwo zapamiętać i przekazać dalej bez fizycznej obecności przy kiosku. |

Relacje: `1—N` do `tablets` (ale logicznie max 1 aktywny dzięki `UNIQUE`),
`N—N` do `users` przez tabelę łączącą (niżej), `1—N` do `tickets`.

### 🆕 `users` (zastępuje `admins`)

| pole | typ | uwagi |
|---|---|---|
| `id` | UUID, PK | |
| `username` | String(50), unique, indexed | login, niezależny od `full_name` |
| `full_name` | String(120) | "Jan Kowalski" |
| `position` | String(120), nullable | "stanowisko", np. "Lekarz kardiolog" |
| `role` | String(20) — `"ADMIN"` / `"OPERATOR"` | enum string jak przy `tickets.status` |
| `password_hash` | String(255) | bcrypt, jak dziś |
| `is_active` | bool, default `True` | |
| `created_at` | DateTime(timezone=True) | |

### 🆕 `user_locations` (tabela łącząca, many-to-many)

| pole | typ |
|---|---|
| `user_id` | UUID, FK → `users.id`, część PK |
| `location_id` | int, FK → `locations.id`, część PK |

Composite PK `(user_id, location_id)`. Operatorzy z rolą `ADMIN` mają
"dostęp globalny" w UI — w bazie to po prostu brak wierszy w tej tabeli dla
tego usera (frontend już dziś interpretuje pusty `locationIds` u admina
jako "wszędzie", nic do zmiany).

### 🔧 `tablets`

| pole | typ | uwagi |
|---|---|---|
| `id` | int, PK | bez zmian |
| `name` | String(100) | bez zmian, może być pusty string (frontend pokazuje wtedy "Nazwa nie została ustawiona") |
| ~~`location`~~ | — | **usunąć** (patrz pkt. 2.4) |
| `location_id` | int, FK → `locations.id`, nullable, **UNIQUE** | zmiana nazwy z `service_point_id` dla spójności z frontendem (`locationId`) |
| `is_active` | bool, default `True` | **nowe** |
| `last_seen_at` | DateTime(timezone=True), nullable | **nowe** — bije heartbeat przez `GET /kiosk/status`, online = `now - last_seen_at < 45s`. Nie trzymać osobnego boola `online`, bo zostaje "zawieszony" gdy tablet padnie bez grzecznego rozłączenia. |
| `pairing_token` | String(64), nullable | **wdrożone** — generowany automatycznie przy `POST /admin/tablets`, zwrócony w odpowiedzi i wyświetlony w panelu webowym (zakładka Tablety) do ręcznego wpisania w aplikacji mobilnej ("Konfiguracja kiosku"). Stały, nie wygasa — to nie jest już jednorazowy token parowania QR (patrz sekcja 4, "Kiosk"). |

### 🔧 `tickets`

| pole | typ | uwagi |
|---|---|---|
| `id` | UUID, PK | bez zmian |
| `ticket_code` | String(10), indexed | bez zmian |
| `status` | String(20) | bez zmian — `WAITING/SERVING/COMPLETED/CANCELLED` |
| `joined_at` | DateTime(timezone=True) | bez zmian |
| `called_at` | DateTime(timezone=True), nullable | **nowe** — kiedy operator wezwał |
| `served_at` | DateTime(timezone=True), nullable | **nowe** — kiedy zakończono/anulowano |
| `customer_name` | String(120), nullable | **nowe** — opcjonalne imię/nazwisko z formularza dołączenia do kolejki |
| `appointment_time` | String(20), nullable | **nowe** — np. "09:15", jeśli wizyta z rejestracji, nie walk-in |
| `served_by_user_id` | UUID, FK → `users.id`, nullable | **nowe** — który operator obsługuje/obsłużył |
| `location_id` | int, FK → `locations.id` | zmiana nazwy z `service_point_id` |

---

## 4. Endpointy REST

Prefiks i konwencja jak dziś: `/api/v1/...`, zasoby admina pod
`/api/v1/admin/...`, wszystko poza `auth`/`kiosk`/`queue` wymaga nagłówka
`Authorization: Bearer <token>`.

### Auth

| metoda | ścieżka | opis |
|---|---|---|
| POST | `/api/v1/auth/login` | 🔧 dziś sprawdza tylko `admins`; ma sprawdzać `users` (dowolna rola). Response rozszerzyć o `role`, `full_name`, `id` — frontend dziś od razu po loginie potrzebuje wiedzieć kim jest, nie tylko mieć token. |
| GET | `/api/v1/auth/me` | 🆕 zwraca profil aktualnie zalogowanego na podstawie tokena (`id`, `full_name`, `role`, `location_ids`). Frontend dziś *ufa* temu, co sam zapisał w `localStorage` — to jedyne miejsce, gdzie warto to zweryfikować po stronie serwera. |
| POST | `/api/v1/auth/refresh` | ✅ wdrożone — wydaje nowy token (ta sama odpowiedź co `login`) w miejsce wciąż ważnego. Panel woła to po połowie czasu życia tokena, jeśli użytkownik był aktywny; bez aktywności token wygasa (`ACCESS_TOKEN_EXPIRE_MINUTES`, domyślnie 120) i panel wylogowuje z komunikatem, a 5 min wcześniej pyta, czy przedłużyć. Wygasły token lub dezaktywowane konto → `401`. |

| GET | `/api/v1/auth/me/preferences` | ✅ wdrożone — ustawienia panelu zapisane na koncie (kolumna `users.preferences`, JSONB): `theme` (`light`/`dark`/`system`), `text_size` (`normal`/`large`/`xlarge`), `high_contrast`, `reduce_motion`, `undo_seconds` (6/10/20), `sound_on_new_ticket`, `default_location_id`, `single_key_shortcuts`. Brakujące pola uzupełniane wartościami domyślnymi. |
| PUT | `/api/v1/auth/me/preferences` | ✅ wdrożone — zmienia tylko przesłane pola i zwraca komplet. Nieznane pole lub niedozwolona wartość → `422`; `default_location_id` spoza lokalizacji użytkownika → `403`. |

**Uprawnienia (wymuszane przez backend, nie tylko ukryte w UI):**
- tylko `ADMIN`: wszystkie `/admin/tablets*`, `/admin/users*` oraz tworzenie/edycja/usuwanie/(de)aktywacja `/admin/locations*` (`403` dla operatora); admin nie może odebrać sobie roli; rola musi być `ADMIN` albo `OPERATOR` (`422`);
- `ADMIN` lub operator przypisany do lokalizacji: `GET /admin/locations/{id}/queue`, `pause-queue`, `resume-queue`, `/admin/tickets/{id}/call|complete|cancel` (`403` dla cudzej lokalizacji);
- `GET /admin/locations` — admin widzi wszystkie, operator tylko swoje;
- WebSocket: operator może subskrybować tylko `location:{id}` swoich lokalizacji, kiosk tylko `tablet:{id}` i swoją lokalizację (pozostałe topiki są pomijane w odpowiedzi `subscribed`); `pairing_token` w zdarzeniach `device.*` trafia wyłącznie na topik `admin`; nieważny/wygasły token → zamknięcie z kodem `4001`, nieaktywne konto → `4003`.

### Users (zakładka Użytkownicy)

| metoda | ścieżka | opis |
|---|---|---|
| GET | `/api/v1/admin/users` | lista: `id, username, full_name, position, role, is_active, location_ids[]` |
| POST | `/api/v1/admin/users` | `full_name, position?, role, username, password, location_ids?` |
| PUT | `/api/v1/admin/users/{id}` | edycja danych + `location_ids`; `password` opcjonalny (puste = nie zmieniaj, dokładnie jak dziś robi to UI) |
| POST | `/api/v1/admin/users/{id}/activate` | |
| POST | `/api/v1/admin/users/{id}/deactivate` | **kaskada**: `is_active=False`, czyści wszystkie wiersze tego usera w `user_locations` |
| DELETE | `/api/v1/admin/users/{id}` | kaskadowo usuwa wiersze w `user_locations` |

### Locations (zakładka Lokalizacje)

| metoda | ścieżka | opis |
|---|---|---|
| GET | `/api/v1/admin/locations` | lista: `id, name, description, is_active, tablet (id+name albo null), user_ids[]` |
| POST | `/api/v1/admin/locations` | `name, description?` |
| PUT | `/api/v1/admin/locations/{id}` | `name, description, tablet_id?, user_ids[]` — serwer sam odłącza tablet od poprzedniej lokalizacji jeśli `tablet_id` był już gdzie indziej przypisany (constraint `UNIQUE` to wymusi, ale ładniej zrobić to świadomie w logice, nie liczyć na 500 z bazy) |
| POST | `/api/v1/admin/locations/{id}/activate` | |
| POST | `/api/v1/admin/locations/{id}/deactivate` | **kaskada**: `is_active=False`, `tablets.location_id=NULL` dla przypisanego tabletu, czyści wiersze w `user_locations` dla tej lokalizacji |
| DELETE | `/api/v1/admin/locations/{id}` | kaskadowo jak wyżej + usuwa wiersze |

### Tablets (zakładka Tablety)

| metoda | ścieżka | opis |
|---|---|---|
| GET | `/api/v1/admin/tablets` | 🔧 dorzucić do response: `is_active`, `online` (liczone z `last_seen_at`), `current_ticket_code` (kod najnowszego ticketu o statusie `SERVING` dla `location_id` tabletu, albo `null`) |
| POST | `/api/v1/admin/tablets` | 🔧 `name, location_id?` (bez `location` stringa) |
| PUT | `/api/v1/admin/tablets/{id}` | 🔧 `name, location_id?` — wymusza unikalność, patrz wyżej |
| POST | `/api/v1/admin/tablets/{id}/activate` | |
| POST | `/api/v1/admin/tablets/{id}/deactivate` | **kaskada**: `is_active=False`, `location_id=NULL` |
| DELETE | `/api/v1/admin/tablets/{id}` | ✅ już jest |

### Parowanie tabletu — token ręczny, nie QR jednorazowy

Zdecydowano inaczej niż pierwotny projekt tej sekcji: parowanie jest ręczne i
jednorazowe, bez skanowania QR ani wygasających tokenów.

| metoda | ścieżka | opis |
|---|---|---|
| POST | `/api/v1/admin/tablets` | ✅ **wdrożone** — tworzy wiersz w `tablets` (pusta `name`, `location_id=NULL`, `is_active=True`) i **od razu** generuje stały `pairing_token`, zwrócony w odpowiedzi. Panel webowy (zakładka Tablety) wyświetla ten token operatorowi. |
| GET | `/api/v1/kiosk/status` | ✅ **wdrożone** — heartbeat + stan kiosku. Tablet odpytuje cyklicznie (~20s) z `?tablet_token=<pairing_token>&device_id=<id urządzenia>` (query param, bez JWT); serwer bije `last_seen_at` i zwraca `queue_code` + `current_ticket_code` lokalizacji przypisanej temu tabletowi (albo `null`, jeśli tablet nie ma jeszcze przypisanej lokalizacji — admin przypisuje ją później w zakładce Tablety/Lokalizacje). |
| GET | `/api/v1/kiosk/signup-code` | ✅ **wdrożone** — `?tablet_token=<pairing_token>&device_id=<id urządzenia>`. Generuje świeży, 4-cyfrowy **kod zapisu** (`signup_code`) ważny 30s dla lokalizacji tego tabletu; response `{ signup_code, expires_in_seconds }`. Kod trzymany w Redis (`signup_code:{location_id}` + `signup_lookup:{code}`, TTL 30s); wygenerowanie nowego **od razu unieważnia poprzedni**. Kiosk odpytuje to kilka sekund przed wygaśnięciem i pokazuje kod jako tekst + QR (QR koduje ten sam 4-cyfrowy kod). `401` dla nieaktywnego tabletu, `409` gdy tablet nie ma przypisanej lokalizacji. |

Instalator wpisuje `pairing_token` ręcznie w aplikacji mobilnej, w zakładce
"Konfiguracja kiosku" — od tego momentu tablet zaczyna odpytywać
`/kiosk/status` i działa jako kiosk, niezależnie od tego, czy ma już
przypisaną lokalizację.

### Queue / Tickets

| metoda | ścieżka | opis |
|---|---|---|
| POST | `/api/v1/queue/join` | ✅ **wdrożone**, publiczne (bez JWT) — body `{ signup_code, customer_name?, appointment_time? }`. `signup_code` to 4-cyfrowy kod zapisu z ekranu kiosku (wpisany ręcznie albo zeskanowany z QR), rozwiązywany przez Redis na `location_id`. Stała litera `queue_code` **nie jest akceptowana**. Błędy: `404` — nieprawidłowy lub wygasły kod / lokalizacja nie istnieje, `409` — lokalizacja nieaktywna albo zapisy wstrzymane (`accepting_new_tickets=False`). Tworzy `Ticket(status="WAITING")`, generuje `ticket_code` = `queue_code` + dwucyfrowy numer w danym dniu (reset codziennie per lokalizacja, np. "A01", "A02"...), publikuje `ticket.created` na `location:{id}`. Response: `{ ticket_id, ticket_code, queue_position, location_id, estimated_wait_time_minutes }`. |
| GET | `/api/v1/queue/ticket/{ticket_code}` | ✅ **wdrożone**, publiczne — bezstanowy odczyt stanu biletu: `{ ticket_code, status, queue_position, estimated_wait_time_minutes }`. Aplikacja mobilna woła to przy każdym (re)połączeniu WS pacjenta (sekcja 5), żeby nie utknąć na starym stanie po przegapionym evencie. |
| POST | `/api/v1/queue/cancel` | ✅ **wdrożone**, publiczne — body `{ ticket_code }`. Pacjent sam anuluje swój bilet; tylko dla `status=WAITING` (inaczej `400`). Publikuje `ticket.updated` na `location:{id}` i `QUEUE_UPDATE` do pozostałych oczekujących. |
| GET | `/api/v1/admin/locations/{id}/queue` | ✅ wdrożone — lista oczekujących (`status=WAITING`, sortowane po `joined_at`) + aktualnie obsługiwany (`status=SERVING`) |
| POST | `/api/v1/admin/tickets/{id}/call` | ✅ wdrożone — `status→SERVING`, `served_by_user_id=<zalogowany>`, `called_at=now` |
| POST | `/api/v1/admin/tickets/{id}/complete` | ✅ wdrożone — `status→COMPLETED`, `served_at=now` |
| POST | `/api/v1/admin/tickets/{id}/cancel` | ✅ wdrożone — `status→CANCELLED`, `served_at=now`, `close_reason` z parametru `?reason=NO_SHOW\|STAFF_CANCELLED` (domyślnie `NO_SHOW` dla wezwanego biletu, `STAFF_CANCELLED` dla czekającego). Pacjent anulujący przez `/queue/cancel` dostaje `PATIENT_CANCELLED`. Status pozostaje `CANCELLED`, więc aplikacja mobilna działa bez zmian. |
| GET | `/api/v1/admin/tickets/history` | ✅ wdrożone — zakończone bilety (`COMPLETED`/`CANCELLED`) od `since` (ISO, wymagane — panel wysyła lokalną północ), opcjonalnie `location_id`, `mine=true`, `limit` (≤500). Najnowsze najpierw, z `close_reason` i `served_by_name`. Operator widzi tylko swoje lokalizacje. Źródło listy „Zakończone” i licznika „Twoja zmiana”. |

### Dashboard (opcjonalnie, ale polecam)

| metoda | ścieżka | opis |
|---|---|---|
| GET | `/api/v1/admin/dashboard/summary` | 🆕 zwraca gotowe liczniki: aktywne/wszystkie tablety, użytkownicy, lokalizacje, ile tabletów online teraz. Pulpit dziś liczy to sam z pełnych list pobranych po REST — przy większej liczbie rekordów lepiej policzyć to raz po stronie bazy (`COUNT`/`WHERE`) niż ciągnąć wszystko do frontu tylko po to, żeby zliczyć. |

---

## 5. WebSocket

Frontend dziś **udaje** czas rzeczywisty: każdy tab ustawia `setInterval`
co 8s i lokalnie losuje, czy dany tablet/operator jest online. To wszystko
ma zniknąć na rzecz prawdziwych push'y z serwera. Cel: jedno długo żyjące
połączenie na klienta, zero pollingu REST.

### Połączenie

`WS /api/v1/ws?token=<jwt>` — jeden endpoint dla panelu i kiosków,
multipleksowany po typach zdarzeń, zamiast osobnych socketów per zasób
(mniej połączeń = mniej narzutu po stronie serwera i przeglądarki). Token w
query string przy handshake (WS nie ma nagłówków po stronie przeglądarki w
prosty sposób); ten sam token co REST.

Tablety łączą się tym samym endpointem, ale zamiast JWT podają
`?tablet_token=<pairing_token>&device_id=<id urządzenia>`. Serwer sam
subskrybuje tablet do `tablet:{id}` i (jeśli ma przypisaną lokalizację) do
`location:{id}` — tablet nie musi wysyłać `subscribe`.

Pacjent (gość) **nie** używa tego endpointu — ma osobny, publiczny socket,
patrz "WebSocket pacjenta" niżej.

### Subskrypcje (filtrowanie po stronie serwera, nie klienta)

Zaraz po połączeniu klient wysyła:

```json
{ "type": "subscribe", "topics": ["admin"] }
```

albo, dla tabletu/kiosku, który obchodzi tylko jego własna lokalizacja:

```json
{ "type": "subscribe", "topics": ["location:42"] }
```

Topik `"admin"` = wszystko (panel admina chce widzieć zmiany wszędzie).
Topik `"location:{id}"` = tylko zdarzenia dotyczące tej lokalizacji
(kolejka, status własnego tabletu). To jest sedno wydajności: tablet na
sali 12 nie powinien dostawać eventów o zmianach w lokalizacji 3 —
filtrowanie ma siedzieć po stronie serwera (przy publikacji do Redis/WS),
nie być ignorowane po stronie klienta.

### Zdarzenia serwer → klient (tylko delta, nie pełny obiekt za każdym razem)

| `type` | payload | kiedy |
|---|---|---|
| `device.status` | `{ tablet_id, online }` | zmiana online/offline (na podstawie heartbeatu) |
| `device.updated` | `{ tablet }` | po CRUD (nazwa/lokalizacja/aktywność) |
| `device.created` / `device.deleted` | `{ tablet_id }` | |
| `user.presence` | `{ user_id, status }` (`online/away/offline`) | zmiana obecności operatora |
| `user.updated` / `user.created` / `user.deleted` | `{ user }` / `{ user_id }` | |
| `location.updated` / `location.created` / `location.deleted` | `{ location }` / `{ location_id }` | |
| `ticket.created` | `{ location_id, ticket }` | dołączenie do kolejki |
| `ticket.updated` | `{ location_id, ticket }` | wezwanie / zakończenie / anulowanie — to jest też sposób, w jaki tablet dowiaduje się o nowym "aktualnym kodzie" bez osobnego eventu |

### WebSocket pacjenta (gość)

`WS /api/v1/queue/ws/{ticket_code}` — ✅ **wdrożone**, publiczny, bez JWT;
identyfikacja wyłącznie po `ticket_code` (np. `A01`). Jeśli biletu nie ma,
serwer zamyka połączenie kodem `4004`. Po połączeniu socket jest
subskrybowany do topiku `guest:{ticket_code}`; klient nic nie wysyła, tylko
słucha.

| `event` | payload | kiedy |
|---|---|---|
| `YOUR_TURN` | `{ topic, event }` | operator wezwał ten bilet (`/admin/tickets/{id}/call`) |
| `QUEUE_UPDATE` | `{ topic, event, queue_position, estimated_wait_time_minutes }` | zmiana kolejki (call / complete / cancel przez operatora, anulowanie przez pacjenta) — wysyłane do każdego oczekującego biletu w lokalizacji |

Uwaga: te eventy mają pole `event` (nie `type`) i wielkie litery — inny
format niż delty z `/api/v1/ws`. Socket nie ma pamięci ani powtórek, więc
aplikacja mobilna po każdym (re)połączeniu dociąga stan przez
`GET /api/v1/queue/ticket/{ticket_code}`.

### Heartbeat = jedyny mechanizm wykrywania online/offline

Zamiast REST-owego pollingu albo ręcznego przełącznika: klient (tablet i
panel operatora) wysyła co ~20s:

```json
{ "type": "ping" }
```

Serwer po każdym pingu aktualizuje `last_seen_at`. Osobny lekki task w tle
(co kilka sekund) przegląda rekordy, których `last_seen_at` jest starsze
niż ~45s i nadal oznaczone jako online — przestawia na offline i emituje
`device.status`/`user.presence`. Rozłączenie samego socketu (`on_disconnect`)
robi to samo natychmiast, bez czekania na timeout — heartbeat jest tylko
siatką bezpieczeństwa na wypadek, gdy klient padnie bez grzecznego
zamknięcia połączenia (np. tablet traci prąd).

To dokładnie zastępuje dzisiejsze `Math.random()` w `AdminDashboard.tsx` /
`AdminUsers.tsx` — różnica jest taka, że stan jest teraz prawdziwy i
identyczny dla każdego podłączonego klienta, bo liczy go serwer, a nie
każda karta przeglądarki osobno.

### Redis — po co, skoro już jest w `docker-compose.yml`

Jeśli backend kiedykolwiek pojedzie na więcej niż jednym procesie/replice
Uvicorna (load balancing, kilka workerów), broadcast "w pamięci" jednego
procesu nie dotrze do klientów podłączonych do innego procesu. Redis
pub/sub jest do tego gotowy i nieużywany — rekomendacja: każda mutacja
(CRUD, zmiana statusu ticketu, heartbeat-timeout) publikuje event na kanał
Redis (np. `eque:events`), a każdy proces backendu ma subskrybenta tego
kanału, który rozsyła dalej do swoich lokalnie podłączonych WebSocketów,
filtrując po `topics` z subskrypcji klienta. Działa identycznie przy jednym
procesie i przy wielu — różnica jest niewidoczna z poziomu klienta, ale
oszczędza przepisywania tego później pod presją.

---

## 6. Sugerowana kolejność wdrożenia

1. Auth: dociągnąć `Depends(get_current_user)` na trasy `/admin/*` (dziś
   nic nie chroni endpointów) + migracja `admins` → `users` z `role`.
2. CRUD `users` + `user_locations` (zakładka Użytkownicy przestaje używać
   `localStorage`).
3. CRUD `locations` (rozszerzenie `service_points` o `description`,
   zmiana nazwy pól) + kaskady dezaktywacji.
4. `tablets`: dodać `is_active`, `location_id` (zamiast `location` stringa
   + `service_point_id`), `last_seen_at`, kaskady, `UNIQUE` na
   `location_id`.
5. Realny `queue/join` + endpointy `call/complete/cancel` na ticketach.
6. WebSocket + heartbeat (na końcu — ma sens dopiero gdy REST-owe zasoby,
   które opisuje, już istnieją).
7. Parowanie QR (`/kiosk/pair`) — może iść równolegle z resztą, jest
   odizolowane.
8. `dashboard/summary` — czysty bonus wydajnościowy, nieblokujący.
