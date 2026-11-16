import asyncio
import importlib
import uuid
from types import SimpleNamespace

import jwt
import pytest

import auth


def run(coro):
    return asyncio.run(coro)


class FakeRedis:
    def __init__(self):
        self.data = {}

    async def set(self, key, value, ex=None):
        self.data[key] = (value, ex)

    async def exists(self, key):
        return 1 if key in self.data else 0


class FakeDb:
    def __init__(self, user):
        self.user = user

    def query(self, *_):
        return self

    def filter(self, *_):
        return self

    def first(self):
        return self.user


def make_user(**kw):
    base = dict(id=uuid.uuid4(), username="jan", is_active=True, token_version=0, role="OPERATOR")
    base.update(kw)
    return SimpleNamespace(**base)


def authenticate(token, user, redis):
    return run(auth.authenticate_token(token, FakeDb(user), redis))


def test_token_zawiera_id_konta_wersje_i_jti():
    user = make_user()
    payload = jwt.decode(auth.create_access_token(user), auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    assert payload["sub"] == str(user.id)  # nie login (N2)
    assert payload["ver"] == 0 and payload["jti"]


def test_wazny_token_przechodzi():
    user = make_user()
    assert authenticate(auth.create_access_token(user), user, FakeRedis()) is user


def test_zmiana_wersji_unieważnia_stare_tokeny():
    user = make_user()
    token = auth.create_access_token(user)
    auth.bump_token_version(user)  # zmiana hasła / roli / dezaktywacja
    with pytest.raises(auth.TokenError):
        authenticate(token, user, FakeRedis())
    assert authenticate(auth.create_access_token(user), user, FakeRedis()) is user


def test_wylogowanie_unieważnia_tylko_ten_token():
    user, redis = make_user(), FakeRedis()
    first, second = auth.create_access_token(user), auth.create_access_token(user)
    run(auth.revoke_token(redis, first))
    with pytest.raises(auth.TokenError):
        authenticate(first, user, redis)
    assert authenticate(second, user, redis) is user


def test_ttl_wpisu_nie_przekracza_waznosci_tokenu():
    user, redis = make_user(), FakeRedis()
    run(auth.revoke_token(redis, auth.create_access_token(user)))
    (_, ttl), = redis.data.values()
    assert 0 < ttl <= auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def test_nieaktywne_konto_to_inactive():
    user = make_user(is_active=False)
    with pytest.raises(auth.TokenError) as exc:
        authenticate(auth.create_access_token(user), user, FakeRedis())
    assert exc.value.inactive


def test_stary_token_z_loginem_w_sub_jest_odrzucony():
    user = make_user()
    old = jwt.encode({"sub": "jan", "exp": 9999999999}, auth.SECRET_KEY, algorithm=auth.ALGORITHM)
    with pytest.raises(auth.TokenError):
        authenticate(old, user, FakeRedis())


def test_podrobiony_token_odrzucony():
    user = make_user()
    forged = jwt.encode({"sub": str(user.id), "ver": 0, "jti": "x", "exp": 9999999999}, "inny-klucz" * 4, algorithm="HS256")
    with pytest.raises(auth.TokenError):
        authenticate(forged, user, FakeRedis())


def test_wygasly_token_odrzucony():
    user = make_user()
    expired = jwt.encode({"sub": str(user.id), "ver": 0, "jti": "x", "exp": 1}, auth.SECRET_KEY, algorithm=auth.ALGORITHM)
    with pytest.raises(auth.TokenError, match="wygasł"):
        authenticate(expired, user, FakeRedis())


# ——— Z2: klucz podpisu ———

def _reload_with(monkeypatch, key, env):
    for name, value in (("JWT_SECRET_KEY", key), ("APP_ENV", env)):
        if value is None:
            monkeypatch.delenv(name, raising=False)
        else:
            monkeypatch.setenv(name, value)
    return importlib.reload(auth)


@pytest.fixture(autouse=True)
def restore_auth(monkeypatch):
    yield
    monkeypatch.setenv("JWT_SECRET_KEY", "k" * 48)
    monkeypatch.delenv("APP_ENV", raising=False)
    importlib.reload(auth)


@pytest.mark.parametrize("key", [None, "", "za-krotki"])
def test_brak_lub_krotki_klucz_blokuje_start(monkeypatch, key):
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        _reload_with(monkeypatch, key, None)


def test_tryb_dev_pozwala_na_klucz_zastepczy(monkeypatch):
    mod = _reload_with(monkeypatch, "", "dev")
    assert mod.SECRET_KEY == mod._DEV_SECRET_KEY


def test_dlugi_klucz_przechodzi(monkeypatch):
    assert _reload_with(monkeypatch, "x" * 40, None).SECRET_KEY == "x" * 40
