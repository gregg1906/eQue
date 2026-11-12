import { useSyncExternalStore } from 'react';
import { api } from './api';
import type { UserPreferences } from './apiTypes';

/*
  Ustawienia panelu zapisane na koncie (GET/PUT /auth/me/preferences), a nie w przeglądarce:
  po zalogowaniu na innym komputerze motyw, rozmiar tekstu czy długość okna „Cofnij” są takie same.

  localStorage („eque_prefs”) to tylko kopia do pierwszego malowania — skrypt w index.html
  ustawia z niej motyw, rozmiar tekstu i kontrast, zanim React się uruchomi, żeby nie było
  błysku jasnego tła albo skoku rozmiaru czcionki. Źródłem prawdy jest serwer.
*/

const CACHE_KEY = 'eque_prefs';
const LEGACY_THEME_KEY = 'eque_theme';

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  text_size: 'normal',
  high_contrast: false,
  reduce_motion: false,
  undo_seconds: 6,
  sound_on_new_ticket: false,
  default_location_id: null,
  single_key_shortcuts: true,
};

function readCache(): UserPreferences {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<UserPreferences>) };
    // motyw zapisany przez poprzednią wersję panelu — do czasu pierwszego pobrania z konta
    const legacy = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacy === 'light' || legacy === 'dark' || legacy === 'system') return { ...DEFAULT_PREFERENCES, theme: legacy };
  } catch {
    // brak dostępu do localStorage albo uszkodzony wpis — wartości domyślne
  }
  return DEFAULT_PREFERENCES;
}

function writeCache(prefs: UserPreferences) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(prefs));
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    // bez kopii lokalnej — ustawienia i tak przyjdą z serwera po zalogowaniu
  }
}

let state: UserPreferences = readCache();
let seq = 0;
const listeners = new Set<() => void>();

function setState(next: UserPreferences) {
  state = next;
  writeCache(next);
  listeners.forEach(l => l());
}

export function getPreferences(): UserPreferences {
  return state;
}

export function usePreferences(): UserPreferences {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    getPreferences,
    getPreferences,
  );
}

/** Pobiera ustawienia z konta — wołać po zalogowaniu i po odtworzeniu sesji. */
export async function loadPreferences(): Promise<void> {
  const mySeq = ++seq;
  const prefs = await api.get<UserPreferences>('/auth/me/preferences');
  if (mySeq === seq) setState({ ...DEFAULT_PREFERENCES, ...prefs });
}

/**
  Zmienia ustawienia od razu w interfejsie i zapisuje na koncie. Przy błędzie przywraca
  poprzednią wartość i rzuca dalej (wołający pokazuje komunikat).
*/
export async function updatePreferences(patch: Partial<UserPreferences>): Promise<void> {
  const previous = state;
  const mySeq = ++seq;
  setState({ ...state, ...patch });
  try {
    const saved = await api.put<UserPreferences>('/auth/me/preferences', patch);
    if (mySeq === seq) setState({ ...DEFAULT_PREFERENCES, ...saved });
  } catch (err) {
    if (mySeq === seq) setState(previous);
    throw err;
  }
}

/** Ustawia atrybuty data-* na <html>, z których korzystają style (tokens.css). */
export function applyPreferencesToDocument(prefs: UserPreferences, systemDark: boolean) {
  const root = document.documentElement;
  const theme = prefs.theme === 'system' ? (systemDark ? 'dark' : 'light') : prefs.theme;
  root.setAttribute('data-theme', theme);
  if (prefs.text_size === 'normal') root.removeAttribute('data-text-size');
  else root.setAttribute('data-text-size', prefs.text_size);
  if (prefs.high_contrast) root.setAttribute('data-contrast', 'high');
  else root.removeAttribute('data-contrast');
  if (prefs.reduce_motion) root.setAttribute('data-motion', 'reduce');
  else root.removeAttribute('data-motion');
}
