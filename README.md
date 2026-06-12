# eQue monorepo

Backend: Python

Web: React

Mobile: Flutter

## 1. Wymagania
Aby poprawnie uruchomić projekt potrzebujemy:
* Środowiska Docker.
* Systemu operacyjnego Windows z WSL2
* Python w wersji 3.10 lub wyższej.
* Node.js (dla frontendu) oraz środowiska Flutter (dla mobile).

---

## 2. Infrastruktura 

Platforma - Docker

DB - PostgreSQL

Cache - Redis

---

## 3. Uruchomienie Środowiska (DB, Cache, Web)

Cała infrastruktura bazodanowa, Redis oraz aplikacja frontendowa (React) są zintegrowane w jednym pliku Docker Compose. Aplikacja frontendowa działa w trybie Hot Reload — zmiany w kodzie odświeżają się automatycznie.

### Pierwsze uruchomienie (zbudowanie obrazów m.in. dla Web):
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

Aplikacja Web jest dostępna pod adresem: http://localhost:5173

---

## 4. Uruchomienie Backendu

### Uruchomienie lokalne (temp, docelowo osobny kontener):

1. Otwórz terminal w folderze `backend`.
2. Zainstaluj wymagane biblioteki:
```bash 
pip install -r requirements.txt
```
3. Uruchom serwer API:
```bash 
python -m uvicorn main:app --reload
```
Serwer zostanie uruchomiony na adresie: http://127.0.0.1:8000
Dokumentacja API (Swagger): http://127.0.0.1:8000/docs

---

## 5. Inicjalizacja Bazy Danych (Migracje i Seeding)

Aby serwer backendowy mógł prawidłowo funkcjonować, musi posiadać strukturę tabel w bazie oraz dane testowe (konta, stanowiska, pacjenci). 

Upewnij się, że kontenery Dockera (w tym baza danych) są uruchomione (Krok 3), a następnie wykonaj w terminalu w folderze `backend`:

1. **Utworzenie struktury tabel (Alembic):**
```bash
alembic upgrade head
```
2. **Seeding bazy danych:**
```bash
python seed.py
```

**Konto Superadmina (dostęp do panelu):**
* **Login:** `admin`
* **Hasło:** `admin123` *(Zapisane w bazie w formie kryptograficznego hasha bcrypt).*

---

## 6. Autoryzacja i Standardy API

* **Zabezpieczenie JWT (JSON Web Tokens):** Endpointy dla panelu administratora (np. zarządzanie tabletami) są chronione. W celu ich użycia, frontend musi najpierw uderzyć na endpoint `POST /api/v1/auth/login` podając dane dostępowe. W odpowiedzi otrzyma token JWT.
* **Autoryzacja:** Otrzymany token należy dołączać do nagłówka każdego chronionego zapytania w formacie: `Authorization: Bearer <twój_wygenerowany_token>`.
* **Dokumentacja kontraktów:** Po uruchomieniu serwera (Krok 4), wszystkie dostępne endpointy, metody (CRUD) oraz wymagane schematy (modele zapytań i odpowiedzi) są samoczynnie dokumentowane i dostępne do podglądu pod adresem `/docs`.