import pytest
from password_policy import validate_password


@pytest.mark.parametrize("password", ["1", "krotkie", "11 znakow!!"])
def test_za_krotkie(password):
    assert "co najmniej 12" in validate_password(password)


def test_dwanascie_znakow_przechodzi():
    assert validate_password("kolej-na-kawe") is None


def test_za_dlugie():
    assert "najwyżej 64" in validate_password("a" * 65)


def test_limit_bajtow_bcrypt():
    # 40 znaków po 2 bajty = 80 bajtów, mimo że znaków jest mniej niż 64
    assert "bajtów" in validate_password("ą" * 40)


def test_popularne_bez_wzgledu_na_wielkosc_liter():
    assert "popularne" in validate_password("Password12345")


def test_rowne_loginowi():
    assert "login" in validate_password("jan.kowalski.1", "JAN.KOWALSKI.1")


def test_bez_regul_zlozonosci():
    assert validate_password("tylkomaleliterki") is None
