import pytest
from pydantic import ValidationError

from schemas.api_schemas import ManualTicketRequest


def test_nazwisko_jest_opcjonalne():
    assert ManualTicketRequest().customer_name is None


def test_puste_i_same_spacje_to_brak_nazwiska():
    assert ManualTicketRequest(customer_name="").customer_name is None
    assert ManualTicketRequest(customer_name="   ").customer_name is None


def test_nazwisko_jest_przycinane():
    assert ManualTicketRequest(customer_name="  Jan Kowalski ").customer_name == "Jan Kowalski"


def test_za_dlugie_nazwisko_odrzucone():
    with pytest.raises(ValidationError):
        ManualTicketRequest(customer_name="a" * 121)


def test_dodatkowe_pola_odrzucone():
    with pytest.raises(ValidationError):
        ManualTicketRequest(customer_name="Jan", status="SERVING")
