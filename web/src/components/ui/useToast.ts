import { useSyncExternalStore } from 'react';

export type ToastTone = 'default' | 'error';

export interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
  /** Gdy podane — powiadomienie ma przycisk „Cofnij”. */
  undo?: () => void;
}

export interface ToastOptions {
  tone?: ToastTone;
  undo?: () => void;
  /** Domyślnie 6 s (błąd: 8 s). */
  duration?: number;
}

export const UNDO_WINDOW_MS = 6000;

let current: ToastItem | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

/** Pokazuje powiadomienie (zastępuje poprzednie). Zwraca id, które można przekazać do dismissToast. */
export function showToast(text: string, opts: ToastOptions = {}): number {
  if (timer) clearTimeout(timer);
  const tone = opts.tone ?? 'default';
  const item: ToastItem = { id: ++seq, text, tone, undo: opts.undo };
  current = item;
  emit();
  timer = setTimeout(() => dismissToast(item.id), opts.duration ?? (tone === 'error' ? 8000 : UNDO_WINDOW_MS));
  return item.id;
}

/** Zamyka powiadomienie o danym id (albo bieżące, gdy id nie podano). */
export function dismissToast(id?: number) {
  if (!current || (id !== undefined && current.id !== id)) return;
  if (timer) clearTimeout(timer);
  timer = null;
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getSnapshot = () => current;

export function useCurrentToast(): ToastItem | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const api = { show: showToast, dismiss: dismissToast };

export function useToast() {
  return api;
}
