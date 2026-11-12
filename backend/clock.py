"""
Czas lokalny placówki.

Baza trzyma znaczniki czasu w UTC, ale „dzień” z punktu widzenia placówki
(numeracja biletów A01, A02…, zmiana operatora) zaczyna się o północy czasu
lokalnego. Liczenie dnia w UTC przesuwało reset numeracji w Polsce na 1:00
(zima) albo 2:00 (lato).
"""
import os
from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

APP_TIMEZONE = ZoneInfo(os.getenv("APP_TIMEZONE", "Europe/Warsaw"))


def local_today(now: datetime | None = None) -> date:
    """Bieżąca data w strefie placówki."""
    return (now or datetime.now(timezone.utc)).astimezone(APP_TIMEZONE).date()


def local_day_start_utc(day: date | None = None) -> datetime:
    """Północ czasu lokalnego danego dnia (domyślnie dzisiaj), jako datetime w UTC."""
    day = day or local_today()
    return datetime.combine(day, time.min, tzinfo=APP_TIMEZONE).astimezone(timezone.utc)
