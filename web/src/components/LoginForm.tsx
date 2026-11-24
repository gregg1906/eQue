import { useState } from 'react';
import { api, setToken, ApiError } from '../lib/api';
import type { MeResponse, TokenResponse } from '../lib/apiTypes';
import { loadPreferences } from '../lib/preferences';
import Button from './ui/Button';
import FloatingInput from './ui/FloatingInput';
import Icon from './ui/Icon';

interface LoginFormProps {
  onLoginSuccess: (me: MeResponse) => void;
  /** Informacja nad formularzem, np. że sesja wygasła z powodu braku aktywności. */
  notice?: string | null;
}

const FACILITY_NAME = 'Testowy szpital';
const INVALID_CREDENTIALS = 'Nieprawidłowy login lub hasło. Sprawdź, czy Caps Lock jest wyłączony.';

export default function LoginForm({ onLoginSuccess, notice = null }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Wpisz login i hasło.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const token = await api.post<TokenResponse>('/auth/login', { username, password });
      setToken(token.access_token);
      // ustawienia z konta przed wejściem do panelu — inaczej panel mignąłby w motywie ekranu logowania
      const [me] = await Promise.all([
        api.get<MeResponse>('/auth/me'),
        loadPreferences().catch(() => { /* panel i tak dociągnie je po wejściu */ }),
      ]);
      onLoginSuccess(me);
    } catch (err) {
      // 429: serwer zablokował logowanie po zbyt wielu nieudanych próbach — komunikat mówi, na ile minut
      if (err instanceof ApiError && err.status === 429) setError(err.message);
      else if (err instanceof ApiError && err.status < 500) setError(INVALID_CREDENTIALS);
      else if (err instanceof ApiError) setError('Serwer nie odpowiada. Spróbuj ponownie za chwilę.');
      else setError('Brak połączenia z serwerem. Sprawdź sieć i spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <div className="login">
      <span className="login-brand">
        <img src="/logo-mark.svg" width="26" height="26" alt="" />
        eQue
      </span>

      <main className="login-form">
        <form onSubmit={handleLogin} noValidate>
          <div className="login-head">
            <p className="login-place">{FACILITY_NAME}</p>
            <h1 className="login-title">Logowanie do panelu</h1>
            <p className="login-sub">Dla personelu: operatorów kolejek i administratorów.</p>
          </div>

          {notice && !error && (
            <div className="note" role="status">
              <Icon name="info" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="form-error" role="alert">
              <Icon name="alert" />
              <span>{error}</span>
            </div>
          )}

          <div className="login-fields">
            <FloatingInput
              label="Login"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
            />
            <FloatingInput
              label="Hasło"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyUp={trackCapsLock}
              onKeyDown={trackCapsLock}
              autoComplete="current-password"
              hint={capsLock ? 'Caps Lock jest włączony.' : undefined}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" block disabled={loading}>
            {loading ? 'Logowanie…' : 'Zaloguj się'}
          </Button>
        </form>
      </main>

      <footer className="login-foot">
        <span>Nie pamiętasz hasła? Poproś administratora placówki o nowe.</span>
      </footer>
    </div>
  );
}
