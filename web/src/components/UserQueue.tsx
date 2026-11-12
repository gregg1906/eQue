import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { api } from '../lib/api';
import { ws, type WsMessage } from '../lib/ws';
import { sortByName } from '../lib/sort';
import type { LocationResponse, QueueResponse, RefreshHandle, TicketHistoryEntry, TicketResponse } from '../lib/apiTypes';
import { usePreferences } from '../lib/preferences';
import { outcomeOf, useShiftHistory } from '../lib/useShiftHistory';
import { formatTime, minutesSince, LONG_WAIT_MIN } from '../lib/time';
import { useTick } from '../lib/useTick';
import { useHotkeys } from '../lib/useHotkeys';
import { onQueueCommand } from '../lib/commands';
import { useQueueActions, applyQueueActions, applyLocationActions, type Entry, type QueueAction } from '../lib/useQueueActions';
import Button from './ui/Button';
import Segmented from './ui/Segmented';
import Switch from './ui/Switch';
import TicketCode from './ui/TicketCode';
import StatusPill from './ui/StatusPill';
import EmptyState from './ui/EmptyState';
import Kbd from './ui/Kbd';
import Icon from './ui/Icon';

function joinedLine(ticket: TicketResponse) {
  return `${formatTime(ticket.joined_at)}${ticket.appointment_time ? `, wizyta ${ticket.appointment_time}` : ''}`;
}

function ServingPanel({ location, queue, onDone, onNoShow, onCallFirst, shortcuts }: {
  location: LocationResponse;
  queue: QueueResponse;
  onDone: () => void;
  onNoShow: () => void;
  onCallFirst: () => void;
  /** Czy pokazywać skróty jednoklawiszowe (można je wyłączyć w Ustawieniach). */
  shortcuts: boolean;
}) {
  const serving = queue.serving;
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
          <b>{serving.customer_name || 'Bez nazwiska'}</b>
          <span>Dołączono o {joinedLine(serving)}</span>
        </div>
        <div className="serving-actions">
          <Button variant="primary" size="lg" icon="check" kbd={shortcuts ? 'Enter' : undefined} onClick={onDone}>
            {next ? 'Obsłużono, wezwij następnego' : 'Obsłużono'}
          </Button>
          <Button variant="secondary" size="lg" icon="x" kbd={shortcuts ? 'N' : undefined} onClick={onNoShow}>
            Nie zgłosił się
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="serving-panel is-empty" aria-label="Teraz obsługiwany">
      {paused}
      <div className="serving-label"><span className="serving-label-main">Teraz obsługiwany</span></div>
      <TicketCode code="–" size="hero" />
      <div className="serving-who">
        <b>{next ? 'Nikt nie jest obsługiwany' : 'Nikt nie czeka'}</b>
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
            Wezwij {next.ticket_code}
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
  initialLocationId?: number | null;
}>(function UserQueue({ locationIds, currentUserId, initialLocationId = null }, ref) {
  const [allLocations, setAllLocations] = useState<LocationResponse[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [queues, setQueues] = useState<Record<number, QueueResponse>>({});
  const [chosenId, setChosenId] = useState<number | null>(initialLocationId);
  const [list, setList] = useState<'wait' | 'done'>('wait');
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
      await Promise.all([fetchQueue(action.locationId), action.kind === 'resolve' ? refetchHistory() : undefined]);
    }
  };
  const { entries, perform } = useQueueActions(afterSend);

  // wybór operatora > domyślna lokalizacja z Ustawień > pierwsza alfabetycznie
  const preferredId = chosenId ?? prefs.default_location_id;
  const selectedId = preferredId !== null && available.some(l => l.id === preferredId) ? preferredId : available[0]?.id ?? null;
  const rawLocation = available.find(l => l.id === selectedId) ?? null;
  const location = rawLocation ? applyLocationActions(rawLocation, entries) : null;
  const rawQueue = selectedId !== null ? queues[selectedId] : undefined;
  const queue = rawQueue ? applyQueueActions(rawQueue, entries) : undefined;

  const displayQueues = available.map(l => (queues[l.id] ? applyQueueActions(queues[l.id], entries) : undefined));

  const resolve = (outcome: 'done' | 'noshow') => {
    if (!location || !queue?.serving) return;
    const ticket = queue.serving;
    const next = queue.waiting[0] ?? null;
    const head = outcome === 'done' ? `Obsłużono ${ticket.ticket_code}.` : `Oznaczono, że nie zgłosił się: ${ticket.ticket_code}.`;
    perform(
      { kind: 'resolve', locationId: location.id, ticket, outcome, next },
      next ? `${head} Wezwano ${next.ticket_code}.` : head,
    );
  };

  const call = (ticket: TicketResponse) => {
    if (!location) return;
    perform({ kind: 'call', locationId: location.id, ticket }, `Wezwano ${ticket.ticket_code}.`);
  };

  const primary = () => {
    if (queue?.serving) resolve('done');
    else if (queue?.waiting[0]) call(queue.waiting[0]);
  };

  const togglePause = () => {
    if (!location) return;
    const accepting = !location.accepting_new_tickets;
    perform(
      { kind: 'accepting', locationId: location.id, locationName: location.name, accepting },
      accepting ? `Wznowiono zapisy: ${location.name}.` : `Wstrzymano zapisy: ${location.name}.`,
    );
  };

  const selectLocation = (id: number) => {
    setChosenId(id);
    setList('wait');
  };

  const shortcuts = prefs.single_key_shortcuts;
  useHotkeys({ Enter: primary, n: () => resolve('noshow'), p: togglePause }, !!location && !!queue && shortcuts);

  const commandsRef = useRef({ primary, noshow: () => resolve('noshow'), togglePause, selectLocation });
  useEffect(() => { commandsRef.current = { primary, noshow: () => resolve('noshow'), togglePause, selectLocation }; });
  useEffect(() => onQueueCommand(cmd => {
    const c = commandsRef.current;
    if (cmd.type === 'primary') c.primary();
    else if (cmd.type === 'noshow') c.noshow();
    else if (cmd.type === 'togglePause') c.togglePause();
    else if (cmd.type === 'select') c.selectLocation(cmd.locationId);
  }), []);

  // Dzisiejsza historia z serwera + akcje jeszcze w oknie „Cofnij”
  const pending = pendingFinished(entries, currentUserId);
  const pendingIds = new Set(pending.map(p => p.id));
  const finished = [...pending, ...(history ?? []).filter(h => !pendingIds.has(h.id))];
  const mine = finished.filter(e => e.served_by_user_id === currentUserId && outcomeOf(e) !== 'patient');
  const done = mine.filter(e => outcomeOf(e) === 'served').length;
  const noShow = mine.filter(e => outcomeOf(e) === 'noshow').length;
  const openNow = displayQueues.reduce((sum, q) => sum + (q ? q.waiting.length + (q.serving ? 1 : 0) : 0), 0);
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
          text="Poproś administratora placówki o przypisanie do lokalizacji. Kolejka pojawi się tutaj od razu po przypisaniu."
        />
      </div>
    );
  }

  return (
    <>
      <Segmented
        label="Lokalizacja"
        value={selectedId ?? available[0].id}
        onChange={selectLocation}
        options={available.map((l, i) => {
          const count = displayQueues[i]?.waiting.length;
          return {
            value: l.id,
            letter: l.queue_code,
            label: l.name,
            count,
            ariaLabel: count !== undefined ? `${l.queue_code} ${l.name}, czeka: ${count}` : `${l.queue_code} ${l.name}`,
          };
        })}
      />

      {location && (
        <div className="console">
          <div className="console-main">
            <span className="sr-only" aria-live="polite">
              {queue?.serving ? `Teraz obsługiwany ${queue.serving.ticket_code}` : 'Nikt nie jest obsługiwany'}
            </span>
            <span className="sr-only" aria-live="polite">{arrival?.locationId === selectedId ? arrival.text : ''}</span>
            {queue
              ? <ServingPanel location={location} queue={queue} onDone={() => resolve('done')} onNoShow={() => resolve('noshow')} onCallFirst={primary} shortcuts={shortcuts} />
              : <div className="card card-pad muted" role="status">Wczytywanie kolejki…</div>}

            <div className="qlist-head">
              <Segmented
                label="Lista"
                value={list}
                onChange={setList}
                options={[
                  { value: 'wait', label: 'Oczekujący', count: queue?.waiting.length ?? 0 },
                  { value: 'done', label: 'Zakończone', count: finishedHere.length },
                ]}
              />
              <p className="qlist-caption">Kolejność według godziny dołączenia. Bursztynowy czas: ponad {LONG_WAIT_MIN} min.</p>
            </div>

            {list === 'wait' ? (
              !queue || queue.waiting.length === 0 ? (
                <div className="card">
                  <EmptyState
                    title="Nikt nie czeka"
                    text={location.accepting_new_tickets
                      ? 'Gdy ktoś dołączy przez kiosk, pojawi się tutaj.'
                      : 'Zapisy są wstrzymane, więc nowe osoby nie dołączą.'}
                  />
                </div>
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
                          <b>{entry.customer_name || 'Bez nazwiska'}</b>
                          <span>
                            {joinedLine(entry)}
                            <span className={long ? 'qwait-inline is-long' : 'qwait-inline'}> · {wait} min</span>
                          </span>
                        </div>
                        <span className={long ? 'qwait is-long' : 'qwait'} title="Czas oczekiwania">{wait} min</span>
                        <Button size="sm" className="qlist-action" onClick={() => call(entry)} aria-label={`Wezwij ${entry.ticket_code}`}>
                          Wezwij
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              )
            ) : finishedHere.length === 0 ? (
              <div className="card">
                <EmptyState
                  title="Nic jeszcze nie zakończono"
                  text="Tu zobaczysz bilety zakończone dzisiaj w tej lokalizacji — przez Ciebie i innych operatorów. Historia jest zapisana na serwerze, więc nie znika po odświeżeniu strony."
                />
              </div>
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
                        <b>{entry.customer_name || 'Bez nazwiska'}</b>
                        <span>
                          Zakończono o {entry.served_at ? formatTime(entry.served_at) : '–'}
                          {byOther && ` · ${entry.served_by_name ?? 'inny operator'}`}
                        </span>
                      </div>
                      <span className="qlist-spacer" />
                      <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <aside className="side-stack" aria-label="Zmiana operatora">
            <div className="card side-card">
              <div className="row-between">
                <h2 className="side-card-title">Nowe zapisy</h2>
                <Switch checked={location.accepting_new_tickets} onChange={togglePause} label="Przyjmuj nowe zapisy" />
              </div>
              <p>
                {location.accepting_new_tickets
                  ? 'Kiosk pokazuje kod zapisu. Wyłącz pod koniec zmiany; osoby już czekające obsłużysz normalnie.'
                  : 'Kiosk pokazuje komunikat „Zapisy wstrzymane”. Osoby już czekające obsługujesz normalnie.'}
              </p>
            </div>

            <div className="card side-card">
              <h2 className="side-card-title">Twoja zmiana</h2>
              <div className="tally">
                <div><strong>{done}</strong><span>Obsłużono</span></div>
                <div><strong>{noShow}</strong><span>Nie zgłosiło się</span></div>
              </div>
              <div className="meter" aria-hidden="true">
                <i style={{ clipPath: `inset(0 ${100 - (totalShift ? Math.round((mine.length / totalShift) * 100) : 0)}% 0 0 round 999px)` }} />
              </div>
              <p className="meter-cap">Zakończono <b>{mine.length}</b> z <b>{totalShift}</b> zgłoszeń dzisiaj</p>
            </div>

            <div className="card side-card">
              <h2 className="side-card-title">Skróty</h2>
              {!shortcuts && <p>Skróty jednoklawiszowe są wyłączone w Ustawieniach. Wyszukiwanie działa dalej:</p>}
              <dl className="shortcuts">
                {shortcuts && <>
                  <div><dt>Obsłużono, wezwij następnego</dt><dd><Kbd keys="Enter" /></dd></div>
                  <div><dt>Nie zgłosił się</dt><dd><Kbd keys="N" /></dd></div>
                  <div><dt>Wstrzymaj lub wznów zapisy</dt><dd><Kbd keys="P" /></dd></div>
                </>}
                <div><dt>Szukaj i przejdź</dt><dd><Kbd keys={['Ctrl', 'K']} /></dd></div>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </>
  );
});

export default UserQueue;
