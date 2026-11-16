import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

import auth
from schemas.api_schemas import (
    LocationCreate, LocationUpdate, LoginRequest, TabletCreate, UserCreate, UserUpdate, JoinQueueRequest,
    PatientCancelRequest,
)


# ——— Z5: walidacja ———

def test_nazwa_lokalizacji_5000_znakow_to_422():
    with pytest.raises(ValidationError):
        LocationCreate(name="x" * 5000)


def test_login_300_znakow_odrzucony():
    with pytest.raises(ValidationError):
        UserCreate(username="a" * 300, full_name="A", password="x" * 12)


@pytest.mark.parametrize("login", ["ab", "ze spacja", "a/b", "x;drop"])
def test_zly_wzorzec_loginu(login):
    with pytest.raises(ValidationError):
        UserCreate(username=login, full_name="A", password="x" * 12)


def test_poprawne_loginy():
    for login in ("jan.kowalski", "anna_nowak", "a-b@c", "łukasz.ż"):
        assert UserCreate(username=login, full_name="A", password="x" * 12).username == login


def test_nieznane_pola_w_schematach_admina_odrzucone():
    for model, data in ((LocationUpdate, {"name": "a", "evil": 1}), (UserUpdate, {"is_admin": True}),
                        (TabletCreate, {"name": "t", "x": 1}), (LocationCreate, {"name": "a", "x": 1})):
        with pytest.raises(ValidationError):
            model(**data)


def test_schematy_publiczne_tolerancyjne_dla_mobile():
    assert JoinQueueRequest(signup_code="1234", extra_field=1).signup_code == "1234"
    assert PatientCancelRequest(ticket_code="A01", extra_field=1).ticket_code == "A01"


def test_pusty_tablet_z_panelu_dozwolony():
    assert TabletCreate(name="").name == ""


def test_logowanie_haslem_ponad_72_bajty_nie_wywraca_serwera():
    hashed = auth.hash_password("poprawne-haslo-123")
    assert auth.verify_password("ą" * 100, hashed) is False
    assert auth.verify_password("poprawne-haslo-123", hashed) is True
    assert LoginRequest(username="a", password="x" * 100)


# ——— Z7: limit prób publicznych endpointów ———

class FakeRedis:
    def __init__(self):
        self.counts, self.ttls = {}, {}

    async def get(self, key):
        return self.counts.get(key)

    async def incr(self, key):
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    async def expire(self, key, seconds):
        self.ttls[key] = seconds

    async def ttl(self, key):
        return self.ttls.get(key, -1)


def make_request(redis, ip="10.0.0.1"):
    return SimpleNamespace(client=SimpleNamespace(host=ip), app=SimpleNamespace(state=SimpleNamespace(redis=redis)))


def test_po_10_bledach_429_z_retry_after():
    import main
    redis = FakeRedis()
    req = make_request(redis)

    async def scenario():
        for _ in range(main.PUBLIC_MAX_FAILS):
            await main._check_public_limit(req, "join")
            await main._record_public_failure(req, "join")
        with pytest.raises(HTTPException) as exc:
            await main._check_public_limit(req, "join")
        return exc.value

    err = asyncio.run(scenario())
    assert err.status_code == 429 and "Retry-After" in err.headers
    assert redis.ttls and max(redis.ttls.values()) == main.PUBLIC_WINDOW_SECONDS


def test_limit_jest_osobny_dla_adresow_i_endpointow():
    import main
    redis = FakeRedis()

    async def scenario():
        a = make_request(redis, "1.1.1.1")
        for _ in range(main.PUBLIC_MAX_FAILS):
            await main._record_public_failure(a, "join")
        await main._check_public_limit(make_request(redis, "2.2.2.2"), "join")  # inny adres
        await main._check_public_limit(a, "cancel")  # inny endpoint

    asyncio.run(scenario())
