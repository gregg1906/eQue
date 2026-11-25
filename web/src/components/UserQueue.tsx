import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { api, ApiError } from '../lib/api';
import { MOD_KEY } from '../lib/platform';
import { ws, type WsMessage } from '../lib/ws';
import { sortByName } from '../lib/sort';
import type { LocationResponse, ManualTicketResult, QueueResponse, RefreshHandle, ServingTicket, TicketHistoryEntry, TicketResponse } from '../lib/apiTypes';
import { usePreferences } from '../lib/preferences';
import { outcomeOf, useShiftHistory } from '../lib/useShiftHistory';
import { formatTime, minutesSince, LONG_WAIT_MIN } from '../lib/time';
import { useTick } from '../lib/useTick';
import { useHotkeys } from '../lib/useHotkeys';
import { onQueueCommand } from '../lib/commands';
import { useQueueActions, applyQueueActions, applyLocationActions, type Entry, type QueueAction } from '../lib/useQueueActions';
import AddPersonDrawer from './AddPersonDrawer';
import Button from './ui/Button';
import Segmented from './ui/Segmented';
import { segmentedTabId } from './ui/segmentedIds';
import Switch from './ui/Switch';
import TicketCode from './ui/TicketCode';
import StatusPill from './ui/StatusPill';
import EmptyState from './ui/EmptyState';
import Kbd from './ui/Kbd';
import Icon from './ui/Icon';
import { showToast } from './ui/useToast';

function errorText(err: unknown) {
  return err instanceof ApiError ? err.message : 'brak połączenia z serwerem.';
}

function joinedLine(ticket: TicketResponse) {
  return `${formatTime(ticket.joined_at)}${ticket.appointment_time ? `, wizyta ${ticket.appointment_time}` : ''}`;
}

/** Tyle sekund po wezwaniu serwer nie przyjmie ponowienia (RECALL_COOLDOWN_SECONDS w backendzie). */
const RECALL_COOLDOWN_S = 30;

/** Ile sekund zostało do `until` (ms); odświeża się co sekundę tylko, gdy jest co odliczać. */
function useCountdown(until: number): number {
  const [now, setNow] = useState(() => Date.now());
  // zegar serwera może się różnić od zegara przeglądarki — odliczanie nigdy nie przekracza pełnego limitu
  const left = Math.min(RECALL_COOLDOWN_S, Math.max(0, Math.ceil((until - now) / 1000)));
  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= until) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);
  return left;
}

/** Bilet wezwany przez zalogowanego operatora (najwyżej jeden — pilnuje tego serwer). */
function myServing(queue: QueueResponse | undefined, userId: string): ServingTicket | null {
  return queue?.serving_all.find(t => t.served_by_user_id === userId) ?? null;
}

/** Bilety wezwane przez pozostałe stanowiska w tej samej lokalizacji. */
function OtherDesks({ tickets }: { tickets: ServingTicket[] }) {
  if (tickets.length === 0) return null;
  return (
    <section className="other-desks" aria-label="Inne stanowiska">
      <h2 className="other-desks-title">Inne stanowiska</h2>
      <ul>
        {tickets.map(t => (
          <li key={t.id}>
            <TicketCode code={t.ticket_code} state="called" />
            <span className="other-desks-who">{t.served_by_name ?? 'Inny operator'}</span>
            <span className="other-desks-since">
              {t.called_at ? `wezwano o ${formatTime(t.called_at)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ServingPanel({ location, queue, serving, othersServing, onDone, onNoShow, onCallFirst, onRecall, recallLeft, shortcuts }: {
  location: LocationResponse;
  queue: QueueResponse;
  /** Bilet zalogowanego operatora. */
  serving: TicketResponse | null;
  /** Czy inne stanowiska kogoś teraz obsługują. */
  othersServing: boolean;
  onDone: () => void;
  onNoShow: () => void;
  onCallFirst: () => void;
  onRecall: () => void;
  /** Sekundy do możliwego ponowienia wezwania; 0 = można od razu. */
  recallLeft: number;
  /** Czy pokazywać skróty jednoklawiszowe (można je wyłączyć w Ustawieniach). */
  shortcuts: boolean;
}) {
  const next = queue.waiting[0];
  const paused = !location.accepting_new_tickets && (
    <div className="serving-paused">
      <Icon name="pause" />
      Zapisy wstrzymane. Kiosk nie przyjmuje nowych osób, czekających obsługujesz dalej.
    </div>
  );

  if (serving) {
    return (
      <section className="serving-panel" aria-label="Teraz obsługiwany">
        {paused}
        <div className="serving-label">
          <span className="serving-label-main">Teraz obsługiwany</span>
          <span className="num">Czas oczekiwania: {minutesSince(serving.joined_at)} min</span>
        </div>
        <TicketCode key={serving.id} code={serving.ticket_code} size="hero" className="serving-code-anim" />
        <div className="serving-who">
          {serving.customer_name
            ? <><b>{serving.customer_name}</b><span>Dołączono o {joinedLine(serving)}</span></>
            : <b>Dołączono o {joinedLine(serving)}</b>}
        </div>
        <div className="serving-actions">
          <Button variant="primary" size="lg" icon="check" kbd={shortcuts ? 'Enter' : undefined} onClick={onDone}>
            {next ? 'Obsłużono, wezwij następnego' : 'Obsłużono'}
          </Button>
          <Button variant="secondary" size="lg" icon="x" kbd={shortcuts ? 'N' : undefined} onClick={onNoShow}>
            Nie zgłosił się
          </Button>
          {/* aria-disabled zamiast disabled: po kliknięciu fokus zostaje na przycisku, a odliczanie jest jego etykietą */}
          <Button
            variant="secondary" size="lg" icon="bell" kbd={shortcuts && recallLeft === 0 ? 'R' : undefined}
            className={recallLeft > 0 ? 'is-cooling' : undefined}
            aria-disabled={recallLeft > 0 || undefined}
            onClick={onRecall}
          >
            {recallLeft > 0 ? `Wezwij ponownie za ${recallLeft} s` : 'Wezwij ponownie'}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="serving-panel is-empty" aria-label="Teraz obsługiwany">
      {paused}
      <div className="serving-label"><span className="serving-label-main">Teraz obsługiwany</span></div>
      <div className="serving-who">
        <b>{next ? (othersServing ? 'Nie obsługujesz teraz nikogo' : 'Nikt nie jest obsługiwany') : 'Kolejka jest pusta'}</b>
        <span>
          {next
            ? `Pierwsza w kolejce jest osoba z biletem ${next.ticket_code}.`
            : location.accepting_new_tickets
              ? 'Gdy ktoś dołączy przez kiosk, pojawi się na liście.'
              : 'Zapisy są wstrzymane. Wznów je, żeby kiosk znowu pokazał kod.'}
        </span>
      </div>
      {next && (
        <div className="serving-actions">
          <Button variant="primary" size="lg" icon="bell" kbd={shortcuts ? 'Enter' : undefined} onClick={onCallFirst}>
            Wezwij następną osobę
          </Button>
        </div>
      )}
    </section>
  );
}

const OUTCOME_PILL = {
  served: { tone: 'served', label: 'Obsłużono' },
  noshow: { tone: 'skipped', label: 'Nie zgłosił się' },
  patient: { tone: 'neutral', label: 'Rezygnacja klienta' },
  staff: { tone: 'neutral', label: 'Anulowano' },
} as const;

/** Akcje „zakończ” czekające jeszcze w oknie „Cofnij” — widoczne na liście, zanim dotrą do serwera. */
function pendingFinished(entries: Entry[], currentUserId: string): TicketHistoryEntry[] {
  const out: TicketHistoryEntry[] = [];
  for (const e of entries) {
    if (e.action.kind === 'cancel') {
      out.push({
        ...e.action.ticket,
        status: 'CANCELLED',
        close_reason: 'STAFF_CANCELLED',
        served_at: e.at,
        served_by_user_id: currentUserId,
        served_by_name: null,
      });
      continue;
    }
    if (e.action.kind !== 'resolve') continue;
    const done = e.action.outcome === 'done';
    out.push({
      ...e.action.ticket,
      status: done ? 'COMPLETED' : 'CANCELLED',
      close_reason: done ? null : 'NO_SHOW',
      served_at: e.at,
      served_by_user_id: currentUserId,
      served_by_name: null,
    });
  }
  return out.reverse(); // najnowsze najpierw, jak w historii z serwera
}

const UserQueue = forwardRef<RefreshHandle, {
  locationIds: number[];
  currentUserId: string;
  /** Wybrana kolejka — zakładka w menu bocznym (grupa „Kolejki”). */
  locationId: number;
}>(function UserQueue({ locationIds, currentUserId, locationId }, ref) {
  const [allLocations, setAllLocations] = useState<LocationResponse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [queues, setQueues] = useState<Record<number, QueueResponse>>({});
  const [list, setList] = useState<'wait' | 'done'>('wait');
  const [listFor, setListFor] = useState(locationId);
  if (listFor !== locationId) { setListFor(locationId); setList('wait'); } // nowa kolejka zaczyna od listy oczekujących
  /** Komunikat dla czytnika ekranu o nowej osobie w wybranej kolejce. */
  const [arrival, setArrival] = useState<{ locationId: number; text: string } | null>(null);
  const prefs = usePreferences();
  const { entries: history, refetch: refetchHistory } = useShiftHistory();
  useTick(30000);

  const fetchLocations = useCallback(async (): Promise<LocationResponse[] | null> => {
    try {
      const locs = (await api.get<LocationResponse[]>('/admin/locations')).filter(l => locationIds.includes(l.id));
      setAllLocations(locs);
      return locs;
    } catch {
      // zachowaj ostatnio znane dane
      return null;
    } finally {
      setLoaded(true);
    }
  }, [locationIds]);

  const fetchQueue = useCallback(async (locId: number) => {
    try {
      const q = await api.get<QueueResponse>(`/admin/locations/${locId}/queue`);
      setQueues(prev => ({ ...prev, [locId]: q }));
    } catch {
      // zachowaj ostatni znany stan — WS dociągnie zmiany na żywo
    }
  }, []);

  const available = sortByName(allLocations.filter(l => l.is_active), l => l.name);
  const availableKey = available.map(l => l.id).join(',');

  useEffect(() => {
    const id = setTimeout(fetchLocations, 0);
    return () => clearTimeout(id);
  }, [fetchLocations]);

  useEffect(() => {
    if (!availableKey) return;
    const ids = availableKey.split(',').map(Number);
    const id = setTimeout(() => { ids.forEach(locId => { fetchQueue(locId); }); }, 0);
    return () => clearTimeout(id);
  }, [availableKey, fetchQueue]);

  const refetch = useCallback(async () => {
    const locs = await fetchLocations();
    if (locs) await Promise.all([...locs.filter(l => l.is_active).map(l => fetchQueue(l.id)), refetchHistory()]);
  }, [fetchLocations, fetchQueue, refetchHistory]);

  useImperativeHandle(ref, () => ({ refetch }), [refetch]);

  useEffect(() => {
    const ids = availableKey ? availableKey.split(',').map(Number) : [];
    const handler = (msg: WsMessage) => {
      const locId = (msg.ticket as { location_id?: number } | undefined)?.location_id;
      if (typeof locId === 'number' && ids.includes(locId)) fetchQueue(locId);
    };
    const offCreated = ws.on('ticket.created', msg => {
      handler(msg);
      const ticket = msg.ticket as TicketResponse | undefined;
      if (ticket && ids.includes(ticket.location_id)) {
        setArrival({
          locationId: ticket.location_id,
          text: `Do kolejki dołączył bilet ${ticket.ticket_code}${ticket.customer_name ? `, ${ticket.customer_name}` : ''}.`,
        });
      }
    });
    const offUpdated = ws.on('ticket.updated', handler);
    const offLocUpdated = ws.on('location.updated', msg => {
      const location = msg.location as LocationResponse;
      setAllLocations(prev => prev.map(l => l.id === location.id ? location : l));
    });
    return () => { offCreated(); offUpdated(); offLocUpdated(); };
  }, [availableKey, fetchQueue]);

  const afterSend = async (action: QueueAction, result: unknown) => {
    if (action.kind === 'accepting') {
      const updated = result as LocationResponse | undefined;
      if (updated?.id) setAllLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
      else await fetchLocations();
    } else {
      // historia razem z kolejką — inaczej zakończony bilet na chwilę znika z listy „Zakończone”
      await Promise.all([fetchQueue(action.locationId), action.kind !== 'call' ? refetchHistory() : undefined]);
      // „Wezwij następnego” wybiera serwer — gdy przewidzianą osobę wezwało w tym czasie inne stanowisko,
      // powiedz wprost, kogo naprawdę wezwano.
      const predicted = action.kind === 'resolve' ? action.next : action.kind === 'call' && action.viaNext ? action.ticket : null;
      const called = result as TicketResponse | undefined;
      if (predicted && called?.ticket_code && called.ticket_code !== predicted.ticket_code) {
        showToast(`${predicted.ticket_code} wezwało już inne stanowisko. Wezwano ${called.ticket_code}.`);
      }
    }
  };
  const { entries, perform, immediate, flushPending } = useQueueActions(afterSend);
  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState(0);
  /** Kiedy (ms) operator ostatnio ponowił wezwanie danego biletu — do odliczania przed kolejnym. */
  const [recalledAt, setRecalledAt] = useState<Record<string, number>>({});

  const selectedId = available.some(l => l.id === locationId) ? locationId : null;
  const rawLocation = available.find(l => l.id === selectedId) ?? null;
  const location = rawLocation ? applyLocationActions(rawLocation, entries) : null;
  const rawQueue = selectedId !== null ? queues[selectedId] : undefined;
  const queue = rawQueue ? applyQueueActions(rawQueue, entries) : undefined;

  const displayQueues = available.map(l => (queues[l.id] ? applyQueueActions(queues[l.id], entries) : undefined));
  const myTicket = myServing(queue, currentUserId);
  const recalling = useRef(false);
  const lastSignalMs = myTicket
    ? Math.max(myTicket.called_at ? new Date(myTicket.called_at).getTime() : 0, recalledAt[myTicket.id] ?? 0)
    : 0;
  const recallLeft = useCountdown(lastSignalMs ? lastSignalMs + RECALL_COOLDOWN_S * 1000 : 0);
  const others = queue?.serving_all.filter(t => t.served_by_user_id !== currentUserId) ?? [];

  const resolve = (outcome: 'done' | 'noshow') => {
    if (!location || !queue || !myTicket) return;
    const ticket = myTicket;
    const next = queue.waiting[0] ?? null;
    const head = outcome === 'done' ? `Obsłużono ${ticket.ticket_code}.` : `Oznaczono, że nie zgłosił się: ${ticket.ticket_code}.`;
    perform(
      { kind: 'resolve', locationId: location.id, operatorId: currentUserId, ticket, outcome, next },
      next ? `${head} Wezwano ${next.ticket_code}.` : head,
    );
  };

  /** Wezwanie konkretnej osoby z listy (także poza kolejnością). */
  const call = (ticket: TicketResponse) => {
    if (!location) return;
    if (myTicket) {
      // serwer i tak odrzuci drugie wezwanie — nie kolejkuj akcji, o której wiadomo, że się nie uda
      showToast(`Najpierw zakończ obsługę ${myTicket.ticket_code}.`);
      return;
    }
    perform({ kind: 'call', locationId: location.id, operatorId: currentUserId, ticket, viaNext: false }, `Wezwano ${ticket.ticket_code}.`);
  };

  /** „Wezwij następnego” — kogo, rozstrzyga serwer (dwa stanowiska naraz dostaną dwie różne osoby). */
  const callNext = () => {
    const ticket = queue?.waiting[0];
    if (!location || !ticket || myTicket) return;
    perform({ kind: 'call', locationId: location.id, operatorId: currentUserId, ticket, viaNext: true }, `Wezwano ${ticket.ticket_code}.`);
  };

  /** Wezwanie (albo „Obsłużono, wezwij następnego”) czeka jeszcze w oknie „Cofnij” — pacjent nic nie dostał. */
  const hasPendingCall = !!location && entries.some(e =>
    e.status === 'pending' && e.action.kind !== 'accepting' && e.action.kind !== 'cancel'
    && e.action.locationId === location.id && e.action.operatorId === currentUserId
    && (e.action.kind === 'call' || e.action.next !== null));

  /** F1: ponowny sygnał do osoby, która nie usłyszała wezwania. Bez okna „Cofnij” — ponowienie nic nie psuje. */
  const recall = () => {
    if (!myTicket || recalling.current) return;
    const code = myTicket.ticket_code;
    if (hasPendingCall) {
      // pierwszy sygnał jeszcze nie wyszedł (trwa okno „Cofnij”) — ponowienie to właśnie wysłanie go teraz
      flushPending();
      setRecalledAt(prev => ({ ...prev, [myTicket.id]: Date.now() }));
      showToast(`Wysłano wezwanie ${code}.`);
      return;
    }
    if (recallLeft > 0) {
      showToast(`Osoba została wezwana przed chwilą. Ponów za ${recallLeft} s.`);
      return;
    }
    recalling.current = true;
    immediate(`/admin/tickets/${myTicket.id}/recall`)
      .then(() => {
        setRecalledAt(prev => ({ ...prev, [myTicket.id]: Date.now() }));
        showToast(`Ponowiono wezwanie ${code}.`);
      })
      .catch(err => {
        if (err instanceof ApiError && err.status === 429) setRecalledAt(prev => ({ ...prev, [myTicket.id]: Date.now() }));
        showToast(`Nie udało się ponowić wezwania ${code}: ${errorText(err)}`, { tone: 'error' });
      })
      .finally(() => { recalling.current = false; });
  };

  /** F3: dopisanie osoby bez telefonu. Numer odpowiedzi trafia do okna, więc to nie przechodzi przez „Cofnij”. */
  const addPerson = async (customerName: string | null): Promise<ManualTicketResult> => {
    if (!location) throw new Error('Brak lokalizacji');
    const created = await immediate(`/admin/locations/${location.id}/tickets`, { customer_name: customerName }) as ManualTicketResult;
    void fetchQueue(location.id);
    return created;
  };

  const openAdd = () => { setAddKey(k => k + 1); setAddOpen(true); };

  const cancel = (ticket: TicketResponse) => {
    if (!location) return;
    perform({ kind: 'cancel', locationId: location.id, ticket }, `Anulowano ${ticket.ticket_code}. Osoba zniknęła z kolejki.`);
  };

  const primary = () => {
    if (myTicket) resolve('done');
    else callNext();
  };

  const togglePause = () => {
    if (!location) return;
    const accepting = !location.accepting_new_tickets;
    perform(
      { kind: 'accepting', locationId: location.id, locationName: location.name, accepting },
      accepting ? `Wznowiono zapisy: ${location.name}.` : `Wstrzymano zapisy: ${location.name}.`,
    );
  };

  const shortcuts = prefs.single_key_shortcuts;
  useHotkeys({ Enter: primary, n: () => resolve('noshow'), r: recall, p: togglePause }, !!location && !!queue && shortcuts);

  const commandsRef = useRef({ primary, noshow: () => resolve('noshow'), togglePause, recall, addPerson: openAdd });
  useEffect(() => { commandsRef.current = { primary, noshow: () => resolve('noshow'), togglePause, recall, addPerson: openAdd }; });
  useEffect(() => onQueueCommand(cmd => {
    const c = commandsRef.current;
    if (cmd.type === 'primary') c.primary();
    else if (cmd.type === 'noshow') c.noshow();
    else if (cmd.type === 'togglePause') c.togglePause();
    else if (cmd.type === 'recall') c.recall();
    else if (cmd.type === 'addPerson') c.addPerson();
  }), []);

  // Dzisiejsza historia z serwera + akcje jeszcze w oknie „Cofnij”
  const pending = pendingFinished(entries, currentUserId);
  const pendingIds = new Set(pending.map(p => p.id));
  const finished = [...pending, ...(history ?? []).filter(h => !pendingIds.has(h.id))];
  const mine = finished.filter(e => e.served_by_user_id === currentUserId && outcomeOf(e) !== 'patient');
  const done = mine.filter(e => outcomeOf(e) === 'served').length;
  const noShow = mine.filter(e => outcomeOf(e) === 'noshow').length;
  const openNow = displayQueues.reduce((sum, q) => sum + (q ? q.waiting.length + (myServing(q, currentUserId) ? 1 : 0) : 0), 0);
  const totalShift = mine.length + openNow;
  const finishedHere = selectedId !== null ? finished.filter(e => e.location_id === selectedId) : [];

  if (!loaded) {
    return <p className="muted" role="status">Wczytywanie kolejki…</p>;
  }

  if (available.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon="pin"
          title="Nie masz przypisanych lokalizacji"
          text="Poproś administratora placówki o przypisanie. Kolejka pojawi się tu od razu."
        />
      </div>
    );
  }

  return (
    <>
      {location && (
        <div className="console">
          <div className="console-main">
            <span className="sr-only" aria-live="polite">
              {myTicket ? `Teraz obsługujesz ${myTicket.ticket_code}` : 'Nie obsługujesz teraz nikogo'}
            </span>
            <span className="sr-only" aria-live="polite">{arrival?.locationId === selectedId ? arrival.text : ''}</span>
            {queue
              ? <ServingPanel location={location} queue={queue} serving={myTicket} othersServing={others.length > 0} onDone={() => resolve('done')} onNoShow={() => resolve('noshow')} onCallFirst={primary} onRecall={recall} recallLeft={recallLeft} shortcuts={shortcuts} />
              : <div className="card card-pad muted" role="status">Wczytywanie kolejki…</div>}
            <OtherDesks tickets={others} />

            <div className="qlist-head">
              <Segmented
                label="Lista"
                panelId="qlist-panel"
                value={list}
                onChange={setList}
                options={[
                  { value: 'wait', label: 'Oczekujący', count: queue?.waiting.length ?? 0 },
                  { value: 'done', label: 'Zakończone', count: finishedHere.length },
                ]}
              />
              <Button size="sm" icon="plus" className="qlist-add" onClick={openAdd}>Dodaj osobę</Button>
            </div>
            {list === 'wait' && <p className="qlist-caption">Według godziny dołączenia · bursztynowy czas = ponad {LONG_WAIT_MIN} min</p>}

            <div role="tabpanel" id="qlist-panel" aria-labelledby={segmentedTabId('qlist-panel', list)}>
            {list === 'wait' ? (
              !queue || queue.waiting.length === 0 ? (
                <p className="qlist-empty">
                  {location.accepting_new_tickets
                    ? 'Nikt nie czeka. Nowe osoby z kiosku pojawią się tutaj.'
                    : 'Nikt nie czeka. Zapisy są wstrzymane, więc nowe osoby nie dołączą.'}
                </p>
              ) : (
                <ol className="qlist" aria-label="Oczekujący">
                  {queue.waiting.map((entry, i) => {
                    const wait = minutesSince(entry.joined_at);
                    const long = wait >= LONG_WAIT_MIN;
                    return (
                      <li key={entry.id}>
                        <span className="qpos">{i + 1}</span>
                        <TicketCode code={entry.ticket_code} />
                        <div className="qname">
                          {entry.customer_name ? (
                            <>
                              <b>{entry.customer_name}</b>
                              <span>
                                {joinedLine(entry)}
                                <span className={long ? 'qwait-inline is-long' : 'qwait-inline'}> · {wait} min</span>
                              </span>
                            </>
                          ) : (
                            <>
                              <b>Dołączono o {joinedLine(entry)}</b>
                              <span className={long ? 'qwait-inline is-long' : 'qwait-inline'}>Czeka {wait} min</span>
                            </>
                          )}
                        </div>
                        <span className={long ? 'qwait is-long' : 'qwait'} title="Czas oczekiwania">{wait} min</span>
                        <span className="qlist-actions">
                          <Button size="sm" variant="ghost" className="qlist-cancel" onClick={() => cancel(entry)} aria-label={`Anuluj ${entry.ticket_code}`}>
                            Anuluj
                          </Button>
                          <Button size="sm" className="qlist-action" onClick={() => call(entry)} aria-label={`Wezwij ${entry.ticket_code}`}>
                            Wezwij
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )
            ) : finishedHere.length === 0 ? (
              <p className="qlist-empty">Nic jeszcze dziś nie zakończono w tej lokalizacji.</p>
            ) : (
              <ol className="qlist" aria-label="Zakończone">
                {finishedHere.map(entry => {
                  const pill = OUTCOME_PILL[outcomeOf(entry)];
                  const byOther = entry.served_by_user_id && entry.served_by_user_id !== currentUserId;
                  return (
                    <li key={entry.id}>
                      <span className="qpos" />
                      <TicketCode code={entry.ticket_code} state="done" />
                      <div className="qname">
                        {(() => {
                          const doneAt = `Zakończono o ${entry.served_at ? formatTime(entry.served_at) : '–'}`;
                          const other = byOther ? (entry.served_by_name ?? 'inny operator') : null;
                          return entry.customer_name
                            ? <><b>{entry.customer_name}</b><span>{doneAt}{other && ` · ${other}`}</span></>
                            : <><b>{doneAt}</b>{other && <span>{other}</span>}</>;
                        })()}
                      </div>
                      <span className="qlist-spacer" />
                      <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    </li>
                  );
                })}
              </ol>
            )}
            </div>
          </div>

          <aside className="side-stack" aria-label="Zmiana operatora">
            <section className="side-card">
              <div className="row-between">
                <h2 className="side-card-title">Nowe zapisy</h2>
                <Switch checked={location.accepting_new_tickets} onChange={togglePause} label="Przyjmuj nowe zapisy" />
              </div>
              <p>
                {location.accepting_new_tickets
                  ? 'Kiosk przyjmuje nowe osoby. Wyłącz pod koniec zmiany — czekających obsłużysz normalnie.'
                  : 'Kiosk pokazuje komunikat „Zapisy wstrzymane”. Osoby już czekające obsługujesz normalnie.'}
              </p>
            </section>

            <section className="side-card">
              <h2 className="side-card-title">Twoja zmiana dzisiaj</h2>
              <div className="tally">
                <div><strong>{done}</strong><span>Obsłużono</span></div>
                <div><strong>{noShow}</strong><span>Nie zgłosiło się</span></div>
              </div>
              <div className="meter" aria-hidden="true">
                <i style={{ clipPath: `inset(0 ${100 - (totalShift ? Math.round((mine.length / totalShift) * 100) : 0)}% 0 0 round 999px)` }} />
              </div>
              <p className="meter-cap">Zakończono <b>{mine.length}</b> z <b>{totalShift}</b> zgłoszeń</p>
            </section>

            <section className="side-card">
              <h2 className="side-card-title">Skróty</h2>
              {!shortcuts && <p>Skróty jednoklawiszowe są wyłączone w Ustawieniach. Wyszukiwanie działa dalej:</p>}
              <dl className="shortcuts">
                {shortcuts && <>
                  <div><dt>Obsłużono, wezwij następnego</dt><dd><Kbd keys="Enter" /></dd></div>
                  <div><dt>Nie zgłosił się</dt><dd><Kbd keys="N" /></dd></div>
                  <div><dt>Wezwij ponownie</dt><dd><Kbd keys="R" /></dd></div>
                  <div><dt>Wstrzymaj lub wznów zapisy</dt><dd><Kbd keys="P" /></dd></div>
                </>}
                <div><dt>Szukaj i przejdź</dt><dd><Kbd keys={[MOD_KEY, 'K']} /></dd></div>
              </dl>
            </section>
          </aside>
        </div>
      )}
      {location && (
        <AddPersonDrawer
          key={addKey}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          locationName={location.name}
          queueCode={location.queue_code}
          accepting={location.accepting_new_tickets}
          onSubmit={addPerson}
        />
      )}
    </>
  );
});

export default UserQueue;
