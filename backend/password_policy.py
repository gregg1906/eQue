"""
Polityka haseł (Z1), oparta na NIST SP 800-63B-4: liczy się długość, a nie reguły złożoności
(wielkie litery, znaki specjalne) ani okresowa zmiana hasła. Hasło odrzucamy, gdy jest za krótkie,
za długie (limit bcrypt: 72 bajty), z listy najpopularniejszych albo równe loginowi.

Te same reguły są w web/src/lib/passwordPolicy.ts — serwer rozstrzyga, przeglądarka tylko podpowiada.
"""
MIN_LENGTH = 12  # kompromis: NIST zaleca 15 dla hasła jako jedynego składnika, 8 przy MFA
MAX_LENGTH = 64
MAX_BYTES = 72  # bcrypt ignoruje (albo odrzuca) wszystko ponad 72 bajty

# Krótka lista najpopularniejszych haseł o długości zbliżonej do wymaganej (porównanie bez wielkości liter).
COMMON_PASSWORDS = frozenset({
    "password1234", "password12345", "password123456", "passwordpassword", "qwertyuiop12",
    "qwertyuiop123", "qwerty123456", "qwertyqwerty", "1q2w3e4r5t6y", "1qaz2wsx3edc",
    "123456789012", "1234567890123", "12345678901234", "123123123123", "111111111111",
    "000000000000", "abcdefghijkl", "abcd12345678", "iloveyou1234", "administrator",
    "administrator1", "admin1234567", "admin123456", "adminadmin12", "welcome12345",
    "letmein12345", "changeme1234", "zaq12wsxcde3", "polska123456", "polskapolska",
    "haslo1234567", "haslohaslo12", "mojehaslo123", "mojehaslo1234", "kochamcie123",
    "operator1234", "operator12345", "operatoroperator", "kolejka12345", "equeeque1234",
    "adminadminadmin", "passwordadmin1", "123456qwerty", "qwerty1234567", "asdfghjkl123",
    "asdfghjklqwe", "trustno1trustno1", "superpassword1", "monkey123456", "dragon123456",
})


def validate_password(password: str, username: str | None = None) -> str | None:
    """Zwraca komunikat błędu po polsku albo None, gdy hasło spełnia politykę."""
    if len(password) < MIN_LENGTH:
        return f"Hasło musi mieć co najmniej {MIN_LENGTH} znaków."
    if len(password) > MAX_LENGTH:
        return f"Hasło może mieć najwyżej {MAX_LENGTH} znaków."
    if len(password.encode("utf-8")) > MAX_BYTES:
        return f"Hasło jest za długie (limit {MAX_BYTES} bajtów — znaki spoza ASCII zajmują więcej niż jeden)."
    lowered = password.lower()
    if lowered in COMMON_PASSWORDS:
        return "To hasło jest zbyt popularne. Wybierz inne, np. kilka słów z odstępami."
    if username and lowered == username.strip().lower():
        return "Hasło nie może być takie samo jak login."
    return None
