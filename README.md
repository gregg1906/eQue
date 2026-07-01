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

## 3. Uruchomienie Środowiska (DB, Cache, Web, Backend)

Cała infrastruktura bazodanowa, Redis oraz aplikacja frontendowa (React) są zintegrowane w jednym pliku Docker Compose. Aplikacja frontendowa działa w trybie Hot Reload — zmiany w kodzie odświeżają się automatycznie.

### Pierwsze uruchomienie (zbudowanie obrazów m.in. dla Web, budowanie backendu, seedowanie bazy):
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
Serwer zostanie uruchomiony na adresie: http://127.0.0.1:8000
Dokumentacja API (Swagger): http://127.0.0.1:8000/docs


---

**Konto Superadmina (dostęp do panelu):**
* **Login:** `admin`
* **Hasło:** `admin123` *(Zapisane w bazie w formie kryptograficznego hasha bcrypt).*

---

## 4. Autoryzacja i Standardy API

* **Zabezpieczenie JWT (JSON Web Tokens):** Endpointy dla panelu administratora (np. zarządzanie tabletami) są chronione. W celu ich użycia, frontend musi najpierw uderzyć na endpoint `POST /api/v1/auth/login` podając dane dostępowe. W odpowiedzi otrzyma token JWT.
* **Autoryzacja:** Otrzymany token należy dołączać do nagłówka każdego chronionego zapytania w formacie: `Authorization: Bearer <twój_wygenerowany_token>`.
* **Dokumentacja kontraktów:** Po uruchomieniu serwera (Krok 4), wszystkie dostępne endpointy, metody (CRUD) oraz wymagane schematy (modele zapytań i odpowiedzi) są samoczynnie dokumentowane i dostępne do podglądu pod adresem `/docs`.