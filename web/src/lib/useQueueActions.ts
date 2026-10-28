import { useEffect, useState } from 'react';
import { ApiError, getToken } from './api';
import type { LocationResponse, QueueResponse, TicketResponse } from './apiTypes';
import { recordResolved, removeResolved } from './ticketActivity';
import { nowIso } from './time';
import { dismissToast, showToast, UNDO_WINDOW_MS } from '../components/ui/useToast';

/*
  „Cofnij” bez endpointu cofania (backend ma tylko call / complete / cancel / pause-queue / resume-queue):
  1. akcja od razu zmienia UI (nakładka na stan z serwera) i pokazuje powiadomienie z „Cofnij” na 6 s,
  2. żądanie idzie dopiero po 6 s albo od razu, gdy operator wykona kolejną akcję (najpierw oczekująca),
  3. „Cofnij” = clearTimeout + zdjęcie nakładki,
  4. pagehide / visibilitychange: hidden / odmontowanie ekranu → wysyłka od razu (fetch z keepalive),
  5. błąd API → zdjęcie nakładki i powiadomienie z opisem z ApiError.
  Nakładka jest stosowana do stanu z serwera przy każdym renderze, więc odświeżenia z WebSocketu
  w trakcie okna „Cofnij” nie cofają widoku.
*/

export type QueueAction =
  /** Obsłużono / nie zgłosił się, opcjonalnie z wezwaniem następnej osoby — jako jedna akcja. */
  | { kind: 'resolve'; locationId: number; ticket: TicketResponse; outcome: 'done' | 'noshow'; next: TicketResponse | null }
  | { kind: 'call'; locationId: number; ticket: TicketResponse }
  | { kind: 'accepting'; locationId: number; locationName: string; accepting: boolean };

interface Entry {
  id: number;
  action: QueueAction;
  at: string;
  status: 'pending' | 'sending';
  /** Token z chwili akcji — żądanie wysłane po wylogowaniu nadal się uwierzytelni. */
  token: string | null;
}

type FlushMode = 'sequential' | 'parallel';
type AfterSend = (action: QueueAction, result: unknown) => Promise<void> | void;

function stepsFor(action: QueueAction): string[] {
  switch (action.kind) {
    case 'resolve': {
      const steps = [`/admin/tickets/${action.ticket.id}/${action.outcome === 'done' ? 'complete' : 'cancel'}`];
      if (action.next) steps.push(`/admin/tickets/${action.next.id}/call`);
      return steps;
    }
    case 'call':
      return [`/admin/tickets/${action.ticket.id}/call`];
    case 'accepting':
      return [`/admin/locations/${action.locationId}/${action.accepting ? 'resume-queue' : 'pause-queue'}`];
  }
}

async function post(path: string, token: string | null): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api/v1${path}`, { method: 'POST', headers, keepalive: true });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
    } catch {
      // odpowiedź nie była JSON-em — zostaje statusText
    }
    throw new ApiError(res.status, detail);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

function errorText(err: unknown) {
  return err instanceof ApiError ? err.message : 'brak połączenia z serwerem';
}

function failureMessage(action: QueueAction, succeeded: boolean[], err: unknown): string {
  const why = errorText(err);
  switch (action.kind) {
    case 'resolve': {
      const code = action.ticket.ticket_code;
      if (succeeded[0] && action.next) return `Zapisano ${code}, ale nie udało się wezwać ${action.next.ticket_code}: ${why}.`;
      return `Nie udało się zakończyć ${code}: ${why}. Przywrócono poprzedni stan.`;
    }
    case 'call':
      return `Nie udało się wezwać ${action.ticket.ticket_code}: ${why}. Przywrócono poprzedni stan.`;
    case 'accepting':
      return `Nie udało się ${action.accepting ? 'wznowić' : 'wstrzymać'} zapisów: ${why}. Przywrócono poprzedni stan.`;
  }
}

function undoMessage(action: QueueAction): string {
  switch (action.kind) {
    case 'resolve': return `Cofnięto. Obsługiwany jest znowu ${action.ticket.ticket_code}.`;
    case 'call': return `Cofnięto wezwanie ${action.ticket.ticket_code}.`;
    case 'accepting': return `Cofnięto. Zapisy są znowu ${action.accepting ? 'wstrzymane' : 'otwarte'}.`;
  }
}

class QueueActionController {
  private entries: Entry[] = [];
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  private toastIds = new Map<number, number>();
  private chain: Promise<void> = Promise.resolve();
  private seq = 0;
  private publish: (entries: Entry[]) => void;
  private afterSend: AfterSend = () => {};

  constructor(publish: (entries: Entry[]) => void) {
    this.publish = publish;
  }

  setAfterSend(fn: AfterSend) {
    this.afterSend = fn;
  }

  perform = (action: QueueAction, text: string) => {
    this.flushAll('sequential');
    const id = ++this.seq;
    const at = nowIso();
    if (action.kind === 'resolve') {
      recordResolved({
        ticketId: action.ticket.id,
        ticketCode: action.ticket.ticket_code,
        customerName: action.ticket.customer_name,
        locationId: action.locationId,
        outcome: action.outcome,
        resolvedAt: at,
      });
    }
    this.set([...this.entries, { id, action, at, status: 'pending', token: getToken() }]);
    this.timers.set(id, setTimeout(() => this.flush(id, 'sequential'), UNDO_WINDOW_MS));
    this.toastIds.set(id, showToast(text, { undo: () => this.undo(id) }));
  };

  undo = (id: number) => {
    const entry = this.entries.find(e => e.id === id);
    if (!entry || entry.status !== 'pending') return;
    this.clearTimer(id);
    this.toastIds.delete(id);
    if (entry.action.kind === 'resolve') removeResolved(entry.action.ticket.id);
    this.set(this.entries.filter(e => e.id !== id));
    showToast(undoMessage(entry.action));
  };

  flushAll = (mode: FlushMode) => {
    this.entries.filter(e => e.status === 'pending').forEach(e => this.flush(e.id, mode));
  };

  private flush(id: number, mode: FlushMode) {
    const entry = this.entries.find(e => e.id === id);
    if (!entry || entry.status !== 'pending') return;
    this.clearTimer(id);
    const toastId = this.toastIds.get(id);
    if (toastId !== undefined) dismissToast(toastId);
    this.toastIds.delete(id);
    this.set(this.entries.map(e => (e.id === id ? { ...e, status: 'sending' } : e)));
    const run = () => this.send(entry, mode);
    // Przy zamykaniu strony nie czekamy na kolejkę — żądania (keepalive) muszą wyjść od razu.
    if (mode === 'parallel') void run();
    else this.chain = this.chain.then(run, run);
  }

  private async send(entry: Entry, mode: FlushMode) {
    const steps = stepsFor(entry.action);
    const succeeded = steps.map(() => false);
    let result: unknown;
    let error: unknown = null;

    if (mode === 'parallel') {
      // Kroki dotyczą różnych biletów (complete obecnego, call następnego), więc kolejność nie jest wymagana.
      const settled = await Promise.allSettled(steps.map(path => post(path, entry.token)));
      settled.forEach((r, i) => {
        if (r.status === 'fulfilled') { succeeded[i] = true; result = r.value; }
        else if (error === null) error = r.reason;
      });
    } else {
      for (let i = 0; i < steps.length; i++) {
        try {
          result = await post(steps[i], entry.token);
          succeeded[i] = true;
        } catch (err) {
          error = err;
          break;
        }
      }
    }

    if (error !== null) {
      if (entry.action.kind === 'resolve' && !succeeded[0]) removeResolved(entry.action.ticket.id);
      showToast(failureMessage(entry.action, succeeded, error), { tone: 'error' });
      result = undefined;
    }
    try {
      await this.afterSend(entry.action, result);
    } catch {
      // odświeżenie nieudane — WebSocket dociągnie zmiany
    }
    this.set(this.entries.filter(e => e.id !== entry.id));
  }

  private clearTimer(id: number) {
    const t = this.timers.get(id);
    if (t) clearTimeout(t);
    this.timers.delete(id);
  }

  private set(entries: Entry[]) {
    this.entries = entries;
    this.publish(entries);
  }
}

/**
  Akcje operatora na kolejce z oknem „Cofnij”. `afterSend` wywołuje się po wysłaniu
  (także po błędzie, z result = undefined) — tu odśwież dane z serwera.
*/
export function useQueueActions(afterSend: AfterSend) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [controller] = useState(() => new QueueActionController(setEntries));

  useEffect(() => { controller.setAfterSend(afterSend); });

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') controller.flushAll('parallel'); };
    const onPageHide = () => controller.flushAll('parallel');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      // wyjście z ekranu kolejki (zmiana zakładki, wylogowanie) — wyślij, nie porzucaj
      controller.flushAll('parallel');
    };
  }, [controller]);

  return { entries, perform: controller.perform };
}

function callInto(serving: TicketResponse | null, waiting: TicketResponse[], ticket: TicketResponse, at: string) {
  // bilet już nie czeka (serwer przetworzył wezwanie albo bilet zniknął) — zostaje stan z serwera
  if (!waiting.some(w => w.id === ticket.id)) return { serving, waiting };
  return {
    serving: { ...ticket, status: 'SERVING' as const, called_at: at },
    waiting: waiting.filter(w => w.id !== ticket.id),
  };
}

/** Kolejka z nałożonymi akcjami, które jeszcze nie doszły do serwera. */
export function applyQueueActions(queue: QueueResponse, entries: { action: QueueAction; at: string }[]): QueueResponse {
  let serving = queue.serving;
  let waiting = queue.waiting;
  for (const { action, at } of entries) {
    if (action.locationId !== queue.location_id) continue;
    if (action.kind === 'resolve') {
      if (serving?.id === action.ticket.id) serving = null;
      waiting = waiting.filter(w => w.id !== action.ticket.id);
      if (action.next) ({ serving, waiting } = callInto(serving, waiting, action.next, at));
    } else if (action.kind === 'call') {
      ({ serving, waiting } = callInto(serving, waiting, action.ticket, at));
    }
  }
  return serving === queue.serving && waiting === queue.waiting ? queue : { ...queue, serving, waiting };
}

/** Lokalizacja z nałożonym wstrzymaniem / wznowieniem zapisów. */
export function applyLocationActions(location: LocationResponse, entries: { action: QueueAction }[]): LocationResponse {
  let accepting = location.accepting_new_tickets;
  for (const { action } of entries) {
    if (action.kind === 'accepting' && action.locationId === location.id) accepting = action.accepting;
  }
  return accepting === location.accepting_new_tickets ? location : { ...location, accepting_new_tickets: accepting };
}
