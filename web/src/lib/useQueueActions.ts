import { useEffect, useState } from 'react';
import { ApiError, errorDetail, getToken, notifyUnauthorized } from './api';
import type { LocationResponse, QueueResponse, ServingTicket, TicketResponse } from './apiTypes';
import { getPreferences } from './preferences';
import { nowIso } from './time';
import { dismissToast, showToast } from '../components/ui/useToast';

/*
  „Cofnij” bez endpointu cofania (backend ma tylko call / call-next / complete / cancel / pause-queue / resume-queue):
  1. akcja od razu zmienia UI (nakładka na stan z serwera) i pokazuje powiadomienie z „Cofnij”
     na 6, 10, 20 albo 60 s — długość okna wybiera użytkownik w Ustawieniach (WCAG 2.2.1),
  2. żądanie idzie dopiero po upływie okna albo od razu, gdy operator wykona kolejną akcję (najpierw oczekująca),
  3. „Cofnij” = clearTimeout + zdjęcie nakładki,
  4. pagehide / visibilitychange: hidden / odmontowanie ekranu → wysyłka od razu (fetch z keepalive),
  5. błąd API → zdjęcie nakładki i powiadomienie z opisem z ApiError.
  Nakładka jest stosowana do stanu z serwera przy każdym renderze, więc odświeżenia z WebSocketu
  w trakcie okna „Cofnij” nie cofają widoku.
*/

export type QueueAction =
  /**
    Obsłużono / nie zgłosił się, opcjonalnie z wezwaniem następnej osoby — jako jedna akcja.
    Następną osobę wybiera serwer (call-next), `next` to tylko przewidywanie do podglądu.
  */
  | { kind: 'resolve'; locationId: number; operatorId: string; ticket: TicketResponse; outcome: 'done' | 'noshow'; next: TicketResponse | null }
  /** `viaNext` — „wezwij następnego” (wybór po stronie serwera), inaczej ten konkretny bilet z listy. */
  | { kind: 'call'; locationId: number; operatorId: string; ticket: TicketResponse; viaNext: boolean }
  /** Anulowanie czekającego biletu przez operatora (np. osoba wyszła). */
  | { kind: 'cancel'; locationId: number; ticket: TicketResponse }
  | { kind: 'accepting'; locationId: number; locationName: string; accepting: boolean };

export interface Entry {
  id: number;
  action: QueueAction;
  at: string;
  status: 'pending' | 'sending';
  /** Token z chwili akcji — gdy operator się wyloguje, zanim żądanie wyjdzie, nadal się uwierzytelni. */
  token: string | null;
}

type FlushMode = 'sequential' | 'parallel';
type AfterSend = (action: QueueAction, result: unknown) => Promise<void> | void;

function stepsFor(action: QueueAction): string[] {
  switch (action.kind) {
    case 'resolve': {
      const steps = [`/admin/tickets/${action.ticket.id}/${action.outcome === 'done' ? 'complete' : 'cancel?reason=NO_SHOW'}`];
      if (action.next) steps.push(`/admin/locations/${action.locationId}/call-next`);
      return steps;
    }
    case 'call':
      return [action.viaNext ? `/admin/locations/${action.locationId}/call-next` : `/admin/tickets/${action.ticket.id}/call`];
    case 'cancel':
      return [`/admin/tickets/${action.ticket.id}/cancel?reason=STAFF_CANCELLED`];
    case 'accepting':
      return [`/admin/locations/${action.locationId}/${action.accepting ? 'resume-queue' : 'pause-queue'}`];
  }
}

async function post(path: string, token: string | null): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api/v1${path}`, { method: 'POST', headers, keepalive: true });
  if (!res.ok) {
    // po wylogowaniu (brak bieżącego tokena) nie ma już sesji do zakończenia
    if (res.status === 401 && getToken()) notifyUnauthorized();
    throw new ApiError(res.status, await errorDetail(res));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

function errorText(err: unknown) {
  // komunikaty serwera bywają zakończone kropką — tu doklejamy własną
  return err instanceof ApiError ? err.message.replace(/\.\s*$/, '') : 'brak połączenia z serwerem';
}

function failureMessage(action: QueueAction, succeeded: boolean[], err: unknown): string {
  const why = errorText(err);
  switch (action.kind) {
    case 'resolve': {
      const code = action.ticket.ticket_code;
      if (succeeded[0] && action.next) return `Zapisano ${code}, ale nie udało się wezwać następnej osoby: ${why}.`;
      return `Nie udało się zakończyć ${code}: ${why}. Przywrócono poprzedni stan.`;
    }
    case 'call':
      return `Nie udało się wezwać ${action.viaNext ? 'następnej osoby' : action.ticket.ticket_code}: ${why}. Przywrócono poprzedni stan.`;
    case 'cancel':
      return `Nie udało się anulować ${action.ticket.ticket_code}: ${why}. Przywrócono poprzedni stan.`;
    case 'accepting':
      return `Nie udało się ${action.accepting ? 'wznowić' : 'wstrzymać'} zapisów: ${why}. Przywrócono poprzedni stan.`;
  }
}

function undoMessage(action: QueueAction): string {
  switch (action.kind) {
    case 'resolve': return `Cofnięto. Obsługiwany jest znowu ${action.ticket.ticket_code}.`;
    case 'call': return `Cofnięto wezwanie ${action.ticket.ticket_code}.`;
    case 'cancel': return `Cofnięto. ${action.ticket.ticket_code} czeka dalej w kolejce.`;
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
    const windowMs = getPreferences().undo_seconds * 1000;
    this.set([...this.entries, { id, action, at, status: 'pending', token: getToken() }]);
    this.timers.set(id, setTimeout(() => this.flush(id, 'sequential'), windowMs));
    this.toastIds.set(id, showToast(text, { undo: () => this.undo(id), duration: windowMs }));
  };

  undo = (id: number) => {
    const entry = this.entries.find(e => e.id === id);
    if (!entry || entry.status !== 'pending') return;
    this.clearTimer(id);
    this.toastIds.delete(id);
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
    const run = () => this.send(entry);
    // Przy zamykaniu strony nie czekamy na kolejkę — żądania (keepalive) muszą wyjść od razu.
    if (mode === 'parallel') void run();
    else this.chain = this.chain.then(run, run);
  }

  private async send(entry: Entry) {
    const steps = stepsFor(entry.action);
    // bieżący token ma pierwszeństwo — w trakcie okna „Cofnij” mógł zostać odnowiony
    const token = getToken() ?? entry.token;
    const succeeded = steps.map(() => false);
    let result: unknown;
    let error: unknown = null;

    // Kroki jednej akcji zawsze po kolei: serwer pozwala operatorowi mieć najwyżej jeden wezwany
    // bilet, więc wezwanie następnej osoby musi dojść po zakończeniu obecnej. Tryb 'parallel'
    // (zamykanie strony) oznacza tylko, że akcje nie czekają na siebie nawzajem.
    for (let i = 0; i < steps.length; i++) {
      try {
        result = await post(steps[i], token);
        succeeded[i] = true;
      } catch (err) {
        error = err;
        break;
      }
    }

    if (error !== null) {
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

type Serving = ServingTicket[];

function callInto(servingAll: Serving, waiting: TicketResponse[], ticket: TicketResponse, viaNext: boolean, operatorId: string, at: string) {
  // „Wezwij następnego”: gdy przewidziany bilet wezwał już ktoś inny, serwer wybierze kolejny czekający.
  const target = waiting.find(w => w.id === ticket.id) ?? (viaNext ? waiting[0] : undefined);
  // bilet już nie czeka (serwer przetworzył wezwanie albo bilet zniknął) — zostaje stan z serwera
  if (!target) return { servingAll, waiting };
  return {
    servingAll: [...servingAll, { ...target, status: 'SERVING' as const, called_at: at, served_by_user_id: operatorId, served_by_name: null }],
    waiting: waiting.filter(w => w.id !== target.id),
  };
}

/** Kolejka z nałożonymi akcjami, które jeszcze nie doszły do serwera. */
export function applyQueueActions(queue: QueueResponse, entries: { action: QueueAction; at: string }[]): QueueResponse {
  const initial: Serving = queue.serving_all ?? (queue.serving ? [{ ...queue.serving, served_by_name: null }] : []);
  let servingAll = initial;
  let waiting = queue.waiting;
  for (const { action, at } of entries) {
    if (action.locationId !== queue.location_id) continue;
    if (action.kind === 'resolve') {
      servingAll = servingAll.filter(t => t.id !== action.ticket.id);
      waiting = waiting.filter(w => w.id !== action.ticket.id);
      if (action.next) ({ servingAll, waiting } = callInto(servingAll, waiting, action.next, true, action.operatorId, at));
    } else if (action.kind === 'call') {
      ({ servingAll, waiting } = callInto(servingAll, waiting, action.ticket, action.viaNext, action.operatorId, at));
    } else if (action.kind === 'cancel') {
      waiting = waiting.filter(w => w.id !== action.ticket.id);
    }
  }
  if (servingAll === initial && waiting === queue.waiting && queue.serving_all) return queue;
  return { ...queue, serving: servingAll.at(-1) ?? null, serving_all: servingAll, waiting };
}

/** Lokalizacja z nałożonym wstrzymaniem / wznowieniem zapisów. */
export function applyLocationActions(location: LocationResponse, entries: { action: QueueAction }[]): LocationResponse {
  let accepting = location.accepting_new_tickets;
  for (const { action } of entries) {
    if (action.kind === 'accepting' && action.locationId === location.id) accepting = action.accepting;
  }
  return accepting === location.accepting_new_tickets ? location : { ...location, accepting_new_tickets: accepting };
}
