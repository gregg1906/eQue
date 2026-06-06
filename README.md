# eQue monorepo

Backend: Python

Web: React

Mobile: Flutter

## 1. Wymagania
Aby poprawnie uruchomić projekt potrzebujemy:
* Środowiska Docker.
* Systemu operacyjnego Windows z WSL2
* Python w wersji 3.10 lub wyższej.
* Node.js (dla frontendu) oraz środowiska Flutter (dla mobile)

---

## 2. Infrastruktura 

Platforma - Docker

DB - PostgreSQL

Cache - Redis

# Uruchomienie środowiska
1. Uruchom aplikację Docker Desktop.
2. Otwórz terminal w głównym folderze projektu.
3. Wpisz komendę:
   ```bash
   docker-compose up -d

## 3. Uruchomienie Backendu

### Uruchomienie lokalne (temp, docelowo osobny kontener):

1. Otwórz terminal w folderze backend
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
