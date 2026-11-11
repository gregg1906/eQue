import { api, getToken, setToken } from './api';
import { closeDialog, confirmDialog } from './dialog-actions';
import type { TokenResponse } from './apiTypes';

/*
  Pilnowanie sesji (JWT ważny ACCESS_TOKEN_EXPIRE_MINUTES, domyślnie 120 min):
  - aktywny użytkownik (klik, klawisz, przewinięcie od ostatniego tokena) — token jest odnawiany
    po połowie czasu życia, więc operator nie zostaje wylogowany w środku zmiany;
  - brak aktywności — na 5 min przed końcem pojawia się dialog z możliwością przedłużenia
    (WCAG 2.2.1 „Dostosowanie czasu”: ostrzeżenie i prosta czynność, żeby wydłużyć limit);
  - token wygasł — wylogowanie z komunikatem zamiast panelu, który po cichu przestaje działać.
  Kilka kart: każda czyta token z localStorage przy każdym sprawdzeniu, więc odnowienie
  w jednej karcie przedłuża sesję wszystkim.
*/

const CHECK_EVERY_MS = 30_000;
const WARN_BEFORE_MS = 5 * 60_000;
const FALLBACK_LIFETIME_MS = 120 * 60_000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

interface TokenTimes {
  issuedAt: number;
  expiresAt: number;
}

function readTokenTimes(token: string): TokenTimes | null {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number; iat?: number };
    if (typeof payload.exp !== 'number') return null;
    const expiresAt = payload.exp * 1000;
    const issuedAt = typeof payload.iat === 'number' ? payload.iat * 1000 : expiresAt - FALLBACK_LIFETIME_MS;
    return { issuedAt, expiresAt };
  } catch {
    return null;
  }
}

export interface SessionKeeperOptions {
  /** Token wygasł albo nie da się go odnowić — wyloguj z komunikatem. */
  onExpired: () => void;
  /** Użytkownik wybrał „Wyloguj” w ostrzeżeniu. */
  onLogout: () => void;
}

/** Uruchamia pilnowanie sesji; zwraca funkcję zatrzymującą (wołać przy wylogowaniu). */
export function startSessionKeeper({ onExpired, onLogout }: SessionKeeperOptions): () => void {
  let stopped = false;
  let lastActivity = Date.now();
  let currentToken: string | null = null;
  let tokenSeenAt = Date.now();
  let warningOpen = false;
  let refreshing = false;

  const markActive = () => { lastActivity = Date.now(); };

  const refresh = async () => {
    if (refreshing) return;
    refreshing = true;
    try {
      const res = await api.post<TokenResponse>('/auth/refresh');
      if (!stopped) setToken(res.access_token);
    } catch {
      // 401 obsłuży api.ts (wylogowanie); błąd sieci — spróbujemy przy następnym sprawdzeniu
    } finally {
      refreshing = false;
    }
  };

  const warn = async () => {
    warningOpen = true;
    const stay = await confirmDialog(
      'Z powodu braku aktywności za około 5 minut zostaniesz wylogowany. Czy chcesz pozostać zalogowany?',
      { title: 'Sesja wkrótce wygaśnie', confirmLabel: 'Pozostań zalogowany', cancelLabel: 'Wyloguj' },
    );
    if (!warningOpen || stopped) return; // dialog zamknięty przez nas (odnowienie w innej karcie albo wygaśnięcie)
    warningOpen = false;
    if (stay) await refresh();
    else onLogout();
  };

  const check = () => {
    if (stopped) return;
    const token = getToken();
    if (!token) return;

    if (token !== currentToken) {
      currentToken = token;
      tokenSeenAt = Date.now();
      if (warningOpen) { warningOpen = false; closeDialog(); }
    }

    const times = readTokenTimes(token);
    if (!times) return;
    const now = Date.now();
    const left = times.expiresAt - now;

    if (left <= 0) {
      if (warningOpen) { warningOpen = false; closeDialog(); }
      stop();
      onExpired();
      return;
    }

    const active = lastActivity > tokenSeenAt;
    const halfLife = (times.expiresAt - times.issuedAt) / 2;
    if (active && left < halfLife) {
      void refresh();
    } else if (!active && left < WARN_BEFORE_MS && !warningOpen) {
      void warn();
    }
  };

  const onVisible = () => { if (document.visibilityState === 'visible') check(); };

  ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, markActive, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', onVisible);
  const interval = setInterval(check, CHECK_EVERY_MS);
  check();

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(interval);
    ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, markActive, { capture: true }));
    document.removeEventListener('visibilitychange', onVisible);
  }

  return stop;
}
