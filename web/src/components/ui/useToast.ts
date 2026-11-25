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
  /** Domyślnie 6 s. Błąd zostaje na ekranie, dopóki go nie zamkniesz (WCAG 2.2.1) — chyba że podasz czas. */
  duration?: number;
}

export interface ToastState {
  item: ToastItem | null;
  /** Trwa animacja wyjścia (--dur-fast) — element jeszcze jest w DOM. */
  closing: boolean;
}

const DEFAULT_DURATION_MS = 6000;
const EXIT_MS = 120;

let state: ToastState = { item: null, closing: false };
let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let exitTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function setState(next: ToastState) {
  state = next;
  listeners.forEach(l => l());
}

function clearTimers() {
  if (timer) clearTimeout(timer);
  if (exitTimer) clearTimeout(exitTimer);
  timer = null;
  exitTimer = null;
}

/** Pokazuje powiadomienie (zastępuje poprzednie). Zwraca id, które można przekazać do dismissToast. */
export function showToast(text: string, opts: ToastOptions = {}): number {
  clearTimers();
  const tone = opts.tone ?? 'default';
  const item: ToastItem = { id: ++seq, text, tone, undo: opts.undo };
  setState({ item, closing: false });
  const duration = opts.duration ?? (tone === 'error' ? null : DEFAULT_DURATION_MS);
  if (duration !== null) timer = setTimeout(() => dismissToast(item.id), duration);
  return item.id;
}

/** Zamyka powiadomienie o danym id (albo bieżące, gdy id nie podano). */
export function dismissToast(id?: number) {
  const { item, closing } = state;
  if (!item || closing || (id !== undefined && item.id !== id)) return;
  clearTimers();
  setState({ item, closing: true });
  exitTimer = setTimeout(() => {
    exitTimer = null;
    setState({ item: null, closing: false });
  }, EXIT_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const getSnapshot = () => state;

export function useToastState(): ToastState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const api = { show: showToast, dismiss: dismissToast };

export function useToast() {
  return api;
}
