# Przewodnik: Migracja Alembic — users/locations refactor

## Co zostało zrobione

| Plik | Zmiana |
|---|---|
| `models.py` | Usunięto `Admin`, `ServicePoint`; dodano `User`, `Location`, `user_locations`; zaktualizowano `Tablet` i `Ticket` |
| `auth.py` | Dodano `get_current_user`, `hash_password`, `get_db`; pełna weryfikacja JWT |
| `main.py` | Login używa tabeli `users`; każdy endpoint `/admin/*` ma `Depends(get_current_user)` |
| `schemas/api_schemas.py` | `TabletCreate`/`TabletResponse` — `location_id` zamiast `location`+`service_point_id` |
| `alembic/versions/d63338fa5256_...` | Nowa migracja — rename zamiast drop dla `admins`→`users_old` i `service_points`→`locations_old` |

---

## Komendy Alembic

### 1. Wygenerowano już automatycznie (gotowe)
```bash
alembic revision --autogenerate -m "users_locations_refactor"
```

### 2. Zastosuj migrację
```bash
alembic upgrade head
```

> [!IMPORTANT]
> Przed uruchomieniem `upgrade head` — jeśli masz dane produkcyjne w `admins` lub `service_points`,
> **najpierw zrób backup bazy** (`pg_dump`). Migracja robi RENAME (nie DROP), więc dane zostają
> w tabelach `users_old` i `locations_old`, ale bezpieczniej mieć backup.

### 3. Sprawdź status migracji
```bash
alembic current
alembic history --verbose
```

---

## Jak ręcznie przenieść dane (po uruchomieniu upgrade)

Po `alembic upgrade head` stara tabela `admins` będzie dostępna jako `users_old`.
Możesz skopiować bootstrapowego admina do nowej tabeli `users` bezpośrednio w Postgres:

```sql
-- Wstaw bootstrapowego admina do nowej tabeli users
-- (uzupełnij full_name i role ręcznie)
INSERT INTO users (id, username, full_name, role, password_hash, is_active, created_at)
SELECT
    id,
    username,
    username AS full_name,   -- lub wpisz prawdziwe imię
    'ADMIN'  AS role,
    password_hash,
    TRUE     AS is_active,
    NOW()    AS created_at
FROM users_old;

-- Sprawdź że transfer się powiódł
SELECT id, username, role FROM users;

-- Dopiero teraz możesz usunąć stare tabele
DROP TABLE users_old;
DROP TABLE locations_old;
```

> [!TIP]
> Alternatywnie: zaktualizuj `seed.py` tak żeby tworzył wpis w tabeli `users` (zamiast `Admin`),
> a potem uruchom seed na świeżej bazie testowej.

---

## Jak ręcznie edytować plik migracji (rename zamiast drop)

Alembic domyślnie generuje `op.drop_table(...)` gdy klasa ORM znika. Żeby zamienić na rename:

**Przed (auto-generated):**
```python
op.drop_index('ix_admins_username', table_name='admins')
op.drop_table('admins')
```

**Po (ręczna edycja — rename zachowuje dane):**
```python
op.drop_index('ix_admins_username', table_name='admins')
op.rename_table('admins', 'users_old')   # <-- RENAME zamiast DROP
```

W wygenerowanym pliku `d63338fa5256_users_locations_refactor.py` ta zmiana jest **już wprowadzona** —
linie 52-55 używają `op.rename_table`.

> [!WARNING]
> `op.rename_table` **nie istnieje w SQLite** — działa tylko na PostgreSQL i MySQL.
> W projekcie używamy PostgreSQL, więc jest OK.

---

## Kolumna NOT NULL bez wartości domyślnej (tablets.is_active)

Gdy dodajesz kolumnę `NOT NULL` do tabeli która już ma wiersze, Postgres wymaga `server_default`.
W migracji dodano:

```python
op.add_column('tablets', sa.Column(
    'is_active', sa.Boolean(), nullable=False,
    server_default=sa.true()   # <-- istniejące wiersze dostaną TRUE
))
```

Po migracji `server_default` nie jest już potrzebny (model ma `default=True` po stronie Pythona).
Możesz go usunąć z kolumny w osobnej migracji jeśli chcesz, ale nie jest to wymagane.

---

## Weryfikacja po migracji

```bash
# Sprawdź że serwer startuje bez błędów
uvicorn main:app --reload

# Test logowania (admin musi być w tabeli users, nie admins)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Test zabezpieczenia endpointu (bez tokena → 403 Forbidden)
curl http://localhost:8000/api/v1/admin/tablets

# Test z tokenem
curl http://localhost:8000/api/v1/admin/tablets \
  -H "Authorization: Bearer <token_z_logowania>"
```
