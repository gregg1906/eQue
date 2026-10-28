import { useState } from 'react';
import { api, setToken, ApiError } from '../lib/api';
import type { MeResponse, TokenResponse } from '../lib/apiTypes';
import Button from './ui/Button';
import FloatingInput from './ui/FloatingInput';
import Icon from './ui/Icon';

interface LoginFormProps {
  onLoginSuccess: (me: MeResponse) => void;
}

const FACILITY_NAME = 'Testowy szpital';
const INVALID_CREDENTIALS ='Login lub hasło są nieprawidłowe. Sprawdź, czy nie masz włączonego Caps Lock.';

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
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
      const me = await api.get<MeResponse>('/auth/me');
      onLoginSuccess(me);
    } catch (err) {
      if (err instanceof ApiError && err.status < 500) setError(INVALID_CREDENTIALS);
      else if (err instanceof ApiError) setError('Serwer chwilowo nie odpowiada. Spróbuj ponownie za chwilę.');
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
      <div className="login-art">
        <span className="login-brand">
          <img src="/logo-mark.svg" width="32" height="32" alt="" />
          eQue
        </span>
        <div className="login-big">{FACILITY_NAME}</div>
        <p>Zarządzaj kolejkami w swojej placówce szybko i wygodnie.</p>
      </div>

      <div className="login-form">
        <form onSubmit={handleLogin} noValidate>
          <h1 className="login-title">Zaloguj się</h1>
          <p className="login-sub">Panel przeznaczony dla personelu.</p>

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
      </div>
    </div>
  );
}
