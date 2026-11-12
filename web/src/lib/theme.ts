import { useSyncExternalStore } from 'react';

export type { ThemePreference } from './apiTypes';

/*
  Ustawienia dostępności z systemu operacyjnego, które przeglądarka udostępnia stronie:
  - prefers-color-scheme: dark — ciemny motyw systemu,
  - prefers-contrast: more — „Zwiększ kontrast” (macOS, iOS) albo motyw kontrastu w Windows.
  Ograniczenie animacji (prefers-reduced-motion) obsługuje sam CSS, bez JS.
*/
export const SYSTEM_DARK = '(prefers-color-scheme: dark)';
export const SYSTEM_MORE_CONTRAST = '(prefers-contrast: more)';
export const SYSTEM_REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function matches(query: string): boolean {
  return window.matchMedia?.(query).matches ?? false;
}

/** Bieżąca wartość zapytania o ustawienie systemu, aktualizowana na żywo po jego zmianie. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    cb => {
      const mq = window.matchMedia?.(query);
      mq?.addEventListener('change', cb);
      return () => mq?.removeEventListener('change', cb);
    },
    () => matches(query),
    () => false,
  );
}
