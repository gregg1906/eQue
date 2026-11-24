# eQue monorepo

System kolejkowy czasu rzeczywistego: klient dołącza do kolejki wpisując/skanując kod z ekranu kiosku, śledzi swoje miejsce na żywo na telefonie i dostaje powiadomienie, gdy operator go wzywa. Operator zarządza kolejką z panelu webowego.

Backend: Python (FastAPI)

Web: React (panel admina/operatora)

Mobile: Flutter (aplikacja klienta + tryb kiosku na tablecie)

---

## 1. Wymagania

Aby poprawnie uruchomić projekt potrzebujemy:
* Środowiska Docker.
* Systemu operacyjnego Windows z WSL2
* Python w wersji 3.10 lub wyższej.
* Node.js (dla frontendu) oraz środowiska Flutter (dla mobile).

---

## 2. Infrastruktura

Platforma - Docker

DB - PostgreSQL (migracje przez Alembic)

Cache / Pub-Sub - Redis (WebSockety na żywo + rotujące kody zapisu do kolejki)

---

## 3. Uruchomienie środowiska (DB, Cache, Web, Backend, Mobile)

Cała infrastruktura bazodanowa, Redis oraz aplikacje frontendowa (React) i mobilna (Flutter Web) są zintegrowane w jednym pliku Docker Compose. Obie działają w trybie Hot Reload — zmiany w kodzie odświeżają się automatycznie (dla Flutter wymaga to restartu kontenera `mobile`, patrz niżej).

### Konfiguracja (opcjonalnie)
Skopiuj `.env.example` do `.env` (plik `.env` nie trafia do repozytorium) i ustaw: `JWT_SECRET_KEY` (**wymagany**, min. 32 bajty — bez niego backend nie startuje; do lokalnych testów można zamiast tego ustawić `APP_ENV=dev`), `ADMIN_INITIAL_PASSWORD` (hasło pierwszego administratora, min. 12 znaków) oraz opcjonalnie `SEED_DEMO_DATA=1`, żeby dodać konta testowe, lokalizacje i bilety z poniższej sekcji 4. Hasło do bazy i strefę czasową placówki też ustawia się w `.env`.

### Pierwsze uruchomienie (zbudowanie obrazów, budowanie backendu, seedowanie bazy):
```bash
docker-compose up -d --build
```

### Każde kolejne uruchomienie:
```bash
docker-compose up -d
```

### Zatrzymanie środowiska:
```bash
docker-compose down
```

### Po zmianach w kodzie Flutter (`mobile/`):
Kontener `flutter run` nie podłapuje zmian automatycznie przez sam bind-mount — po edycji kodu trzeba go zrestartować, żeby przebudował aplikację:
```bash
docker-compose restart mobile
```

| Usługa | Adres |
|---|---|
| Panel webowy (Admin/Operator) | http://localhost:5173 |
| Aplikacja mobilna (Flutter Web — klient + kiosk) | http://localhost:3000 |
| Backend API | http://127.0.0.1:8000 |
| Dokumentacja API (Swagger) | http://127.0.0.1:8000/docs |

---

## 4. Konta testowe (dane z seeda)

Konta poniżej powstają **tylko** przy `SEED_DEMO_DATA=1`. Konto `admin` ma wtedy hasło z `ADMIN_INITIAL_PASSWORD`, a gdy go nie ustawisz — `admin123`. Bez tej zmiennej na pustej bazie powstaje wyłącznie administrator z `ADMIN_INITIAL_PASSWORD`. Nowe hasła (zmiana, reset, nowe konto) muszą spełniać politykę haseł: min. 12 znaków, najwyżej 64, nie z listy popularnych i nie takie jak login.

**Panel webowy:**

| Rola | Login | Hasło | Uwagi |
|---|---|---|---|
| Admin | `admin` | `admin123` | pełny dostęp, wszystkie lokalizacje |
| Operator | `jan.kowalski` | `operator123` | przypisany do „Rejestracja Ogólna" |
| Operator | `anna.nowak` | `operator123` | przypisana do obu lokalizacji |

Hasła zapisane w bazie w formie hasha bcrypt.

**Kioski (tryb tabletu w aplikacji mobilnej — zakładka „Konfiguracja kiosku"):**

| Lokalizacja | Token parowania |
|---|---|
| Rejestracja Ogólna (kod kolejki `A`) | `DEV1-TAB1` |
| Gabinet Kardiologiczny (kod kolejki `B`) | `DEV2-TAB2` |

Token parowania wpisuje się raz — urządzenie zapamiętuje go lokalnie i wraca do trybu kiosku po odświeżeniu strony. Admin może go zresetować w panelu (zakładka Tablety), co wymusza ponowne sparowanie na nowym urządzeniu.

---

## 5. Jak działa kolejka (przepływ end-to-end)

1. **Admin** dodaje lokalizację (panel web, zakładka Lokalizacje) — automatycznie dostaje stałą literę kodu kolejki (np. `A`) i dodaje tablet, który generuje token parowania.
2. **Tablet** (aplikacja mobilna w trybie kiosku) paruje się tym tokenem i wyświetla dwie informacje: stały kod kolejki (informacyjnie) oraz **kod zapisu** — krótkotrwały, 4-cyfrowy kod odświeżany co 30s (+ QR), który jako jedyny pozwala dołączyć do kolejki. To świadome zabezpieczenie: stałej litery nie da się użyć do zapisu, żeby nie dało się jej łatwo przekazać dalej bez fizycznej obecności w kolejce.
3. **Klient** (aplikacja mobilna) wpisuje lub skanuje kod zapisu, dostaje bilet (np. `A05`) i widzi swoją pozycję w kolejce na żywo.
4. **Operator** (panel web, zakładka „Kolejka na żywo") wzywa kolejne osoby — klient dostaje powiadomienie „Twoja kolej" dopiero po jawnym wezwaniu, nigdy automatycznie.
5. Operator może **tymczasowo wstrzymać nowe zapisy** do danej kolejki (np. koniec zmiany) — obsługa już czekających trwa dalej, kiosk pokazuje osobny komunikat „Zapisy wstrzymane" bez kodu/QR.
6. Cały stan (pozycja w kolejce, wezwania, status tabletu, pauzy) synchronizuje się w czasie rzeczywistym przez WebSockety — bez pollingu.

Pełny opis modelu danych, endpointów REST i protokołu WebSocket: [`backend/API_SPEC.md`](backend/API_SPEC.md) i [`mobile/zmianyApi.md`](mobile/zmianyApi.md).

---

## 6. Wygląd / Design system

Panel webowy i aplikacja mobilna dzielą te same kolory (marka teal `#0FB5AB`, neutralne chłodne szarości) i wspólne logo eQue, zaimportowane z projektu Claude Design. Panel webowy ma własną typografię nastawioną na czytelność: jeden krój Atkinson Hyperlegible Next (hierarchia z wagi i rozmiaru), a Atkinson Hyperlegible Mono tylko do kodów biletów i tokenów, żeby 0/O i 1/l były nie do pomylenia. Promienie zaokrągleń zależą od roli elementu, a cienie mają wyłącznie warstwy pływające (okna, menu, powiadomienia).

---

## 7. Autoryzacja i standardy API

* **Zabezpieczenie JWT (JSON Web Tokens):** Endpointy panelu admina/operatora są chronione. Frontend najpierw uderza na `POST /api/v1/auth/login` z danymi dostępowymi i w odpowiedzi dostaje token JWT.
* **Autoryzacja:** Token dołącza się do nagłówka każdego chronionego zapytania: `Authorization: Bearer <token>`.
* **Kiosk (tablet):** osobna autoryzacja bez JWT — przez `pairing_token` + `device_id` urządzenia (reguła „jeden token = jeden fizyczny tablet”, wymuszana na REST i WebSocket).
* **Klient (gość):** endpointy dołączenia/śledzenia kolejki (`/queue/join`, `/queue/ticket/{code}`, WS `/queue/ws/{ticket_code}`) są publiczne, bez tokena — identyfikacja po samym kodzie biletu.
* **Dokumentacja kontraktów:** po uruchomieniu backendu wszystkie endpointy, metody (CRUD) i schematy zapytań/odpowiedzi są automatycznie udokumentowane pod `/docs`.
