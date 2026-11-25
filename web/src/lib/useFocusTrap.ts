import { useEffect, type RefObject } from 'react';

export const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tab i Shift+Tab krążą w obrębie elementu, dopóki `active`. Fokus ustawia i oddaje wywołujący. */
export function trapTab(e: { key: string; shiftKey: boolean; preventDefault: () => void }, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const current = document.activeElement;
  if (e.shiftKey && (current === first || !root.contains(current))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (current === last || !root.contains(current))) { e.preventDefault(); first.focus(); }
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (!e.defaultPrevented) trapTab(e, ref.current); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ref, active]);
}
