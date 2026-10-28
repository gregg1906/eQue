import { useEffect, useRef } from 'react';

type HotkeyMap = Partial<Record<string, () => void>>;

const INTERACTIVE = 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="option"], summary, tr[tabindex]';

function shouldIgnore(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing) return true;
  const target = e.target as HTMLElement | null;
  if (target) {
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return true;
    // Enter na przycisku lub wierszu ma uruchomić właśnie ten element, a nie skrót.
    if (e.key === 'Enter' && target.closest(INTERACTIVE)) return true;
  }
  // otwarte okno dialogowe, panel boczny albo paleta poleceń
  if (document.querySelector('[aria-modal="true"]')) return true;
  return false;
}

/**
  Skróty jednoklawiszowe (np. { Enter, n, p }). Klucze porównywane bez wielkości liter.
  Ignorowane w polach tekstowych, przy otwartym dialogu/palecie i z Ctrl/Cmd/Alt.
*/
export function useHotkeys(map: HotkeyMap, enabled = true) {
  const mapRef = useRef(map);
  useEffect(() => { mapRef.current = map; });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnore(e)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const handler = mapRef.current[key];
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
