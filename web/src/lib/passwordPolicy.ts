/*
  Polityka haseł (Z1) — lustro backend/password_policy.py. Serwer rozstrzyga, a te reguły służą
  tylko wygodzie: komunikat przy polu, zanim formularz trafi do serwera. Bez wymogu wielkich
  liter i znaków specjalnych (NIST SP 800-63B-4: liczy się długość).
*/

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 64;
const PASSWORD_MAX_BYTES = 72;
/** Od tej długości hasło opisujemy jako „mocne”. */
const STRONG_LENGTH = 16;

const COMMON_PASSWORDS = new Set([
  'password1234', 'password12345', 'password123456', 'passwordpassword', 'qwertyuiop12',
  'qwertyuiop123', 'qwerty123456', 'qwertyqwerty', '1q2w3e4r5t6y', '1qaz2wsx3edc',
  '123456789012', '1234567890123', '12345678901234', '123123123123', '111111111111',
  '000000000000', 'abcdefghijkl', 'abcd12345678', 'iloveyou1234', 'administrator',
  'administrator1', 'admin1234567', 'admin123456', 'adminadmin12', 'welcome12345',
  'letmein12345', 'changeme1234', 'zaq12wsxcde3', 'polska123456', 'polskapolska',
  'haslo1234567', 'haslohaslo12', 'mojehaslo123', 'mojehaslo1234', 'kochamcie123',
  'operator1234', 'operator12345', 'operatoroperator', 'kolejka12345', 'equeeque1234',
  'adminadminadmin', 'passwordadmin1', '123456qwerty', 'qwerty1234567', 'asdfghjkl123',
  'asdfghjklqwe', 'trustno1trustno1', 'superpassword1', 'monkey123456', 'dragon123456',
]);

/** Komunikat błędu albo null, gdy hasło spełnia politykę. */
export function validatePassword(password: string, username?: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Hasło może mieć najwyżej ${PASSWORD_MAX_LENGTH} znaków.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return `Hasło jest za długie (limit ${PASSWORD_MAX_BYTES} bajtów — znaki spoza ASCII zajmują więcej niż jeden).`;
  }
  const lowered = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowered)) return 'To hasło jest zbyt popularne. Wybierz inne, np. kilka słów z odstępami.';
  if (username && lowered === username.trim().toLowerCase()) return 'Hasło nie może być takie samo jak login.';
  return null;
}

export type PasswordStrength = { level: 0 | 1 | 2; label: string };

/** Prosty opis siły: liczy się długość, bo to ona ogranicza zgadywanie (poziom 0 = nie spełnia polityki). */
export function passwordStrength(password: string, username?: string): PasswordStrength {
  if (validatePassword(password, username)) return { level: 0, label: 'Nie spełnia wymagań' };
  if (password.length >= STRONG_LENGTH) return { level: 2, label: 'Mocne' };
  return { level: 1, label: 'Wystarczające' };
}
