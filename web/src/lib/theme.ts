export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'eque_theme';

export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // brak dostępu do localStorage — domyślny motyw
  }
  return 'light';
}

export function saveThemePreference(theme: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // brak dostępu do localStorage — motyw działa do odświeżenia strony
  }
}

export function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}
