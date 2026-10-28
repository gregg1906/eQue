import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { api } from '../lib/api';
import { ws, type WsMessage } from '../lib/ws';
import { sortByName } from '../lib/sort';
import { plural } from '../lib/plural';
import { formatOfflineFor, minutesSince, LONG_WAIT_MIN } from '../lib/time';
import { useTick } from '../lib/useTick';
import type { TabletResponse, UserResponse, LocationResponse, QueueResponse, RefreshHandle } from '../lib/apiTypes';
import Button from './ui/Button';
import Icon, { type IconName } from './ui/Icon';
import QueueLetter from './ui/QueueLetter';
import TicketCode from './ui/TicketCode';
import StatusPill from './ui/StatusPill';
import EmptyState from './ui/EmptyState';

export interface NavigateOptions {
  /** Otwórz panel edycji tego elementu na docelowej zakładce. */
  editId?: number;
  /** Otwórz panel dodawania. */
  add?: boolean;
}

interface Issue {
  key: string;
  icon: IconName;
  title: string;
  text: string;
  action: string;
  onFix: () => void;
}

const AdminHome = forwardRef<RefreshHandle, { onNavigate: (tab: string, opts?: NavigateOptions) => void }>(function AdminHome({ onNavigate }, ref) {
  const [tablets, setTablets] = useState<TabletResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [queues, setQueues] = useState<Record<number, QueueResponse>>({});
  const [loaded, setLoaded] = useState(false);
  useTick(30000);

  const fetchQueue = useCallback(async (locId: number) => {
    try {
      const q = await api.get<QueueResponse>(`/admin/locations/${locId}/queue`);
      setQueues(prev => ({ ...prev, [locId]: q }));
    } catch {
      // zachowaj ostatni znany stan
    }
  }, []);

  const refetch = useCallback(async () => {
    try {
      const [t, u, l] = await Promise.all([
        api.get<TabletResponse[]>('/admin/tablets'),
        api.get<UserResponse[]>('/admin/users'),
        api.get<LocationResponse[]>('/admin/locations'),
      ]);
      setTablets(t);
      setUsers(u);
      setLocations(l);
      await Promise.all(l.filter(loc => loc.is_active).map(loc => fetchQueue(loc.id)));
    } catch {
      // zachowaj ostatnio znane dane — WS dociągnie zmiany na żywo
    } finally {
      setLoaded(true);
    }
  }, [fetchQueue]);

  useImperativeHandle(ref, () => ({ refetch }), [refetch]);

  useEffect(() => {
    const initial = setTimeout(refetch, 0);
    return () => clearTimeout(initial);
  }, [refetch]);

  useEffect(() => {
    const onTicket = (msg: WsMessage) => {
      const locId = (msg.ticket as { location_id?: number } | undefined)?.location_id;
      if (typeof locId === 'number') fetchQueue(locId);
    };
    const offs = [
      ws.on('ticket.created', onTicket),
      ws.on('ticket.updated', onTicket),
      ws.on('device.status', msg => {
        const tabletId = msg.tablet_id as number;
        const online = msg.online as boolean;
        setTablets(prev => prev.map(d => d.id === tabletId ? { ...d, online, last_seen_at: online ? new Date().toISOString() : d.last_seen_at } : d));
      }),
      ws.on('device.updated', msg => {
        const tablet = msg.tablet as TabletResponse;
        setTablets(prev => prev.map(d => d.id === tablet.id ? tablet : d));
      }),
      ws.on('device.created', msg => {
        const tablet = msg.tablet as TabletResponse;
        setTablets(prev => prev.some(d => d.id === tablet.id) ? prev : [...prev, tablet]);
      }),
      ws.on('device.deleted', msg => {
        const tabletId = msg.tablet_id as number;
        setTablets(prev => prev.filter(d => d.id !== tabletId));
      }),
      ws.on('location.created', msg => {
        const location = msg.location as LocationResponse;
        setLocations(prev => prev.some(l => l.id === location.id) ? prev : [...prev, location]);
        fetchQueue(location.id);
      }),
      ws.on('location.updated', msg => {
        const location = msg.location as LocationResponse;
        setLocations(prev => prev.map(l => l.id === location.id ? location : l));
      }),
      ws.on('location.deleted', msg => {
        const locationId = msg.location_id as number;
        setLocations(prev => prev.filter(l => l.id !== locationId));
      }),
      ws.on('user.presence', msg => {
        const userId = msg.user_id as string;
        const online = msg.status === 'online';
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, online } : u));
      }),
      ws.on('user.updated', msg => {
        const user = msg.user as UserResponse;
        setUsers(prev => prev.map(u => u.id === user.id ? user : u));
      }),
    ];
    return () => offs.forEach(off => off());
  }, [fetchQueue]);

  if (!loaded) return <p className="muted" role="status">Wczytywanie pulpitu…</p>;

  const activeLocations = locations.filter(l => l.is_active);
  const activeTablets = tablets.filter(t => t.is_active);
  const tabletById = new Map(tablets.map(t => [t.id, t]));
  const locationById = new Map(locations.map(l => [l.id, l]));
  const waitingTotal = activeLocations.reduce((sum, l) => sum + (queues[l.id]?.waiting.length ?? 0), 0);
  const onlineKiosks = activeTablets.filter(t => t.online).length;
  const onlineOperators = users.filter(u => u.is_active && u.role === 'OPERATOR' && u.online).length;

  // Kolejność: najpierw to, co blokuje klientów teraz (kiosk offline), potem braki w konfiguracji.
  const issues: Issue[] = [];
  const tabletIssues: Issue[] = [];
  for (const t of sortByName(activeTablets, t => t.name)) {
    const loc = t.location_id !== null ? locationById.get(t.location_id) : undefined;
    const label = t.name ? `„${t.name}”` : 'bez nazwy';
    const fix = () => onNavigate('tablety', { editId: t.id });
    if (loc?.is_active && !t.online) {
      issues.push({
        key: `offline-${t.id}`, icon: 'tablet',
        title: `Kiosk ${label} ${formatOfflineFor(t.last_seen_at)}`,
        text: `${loc.name}. Klienci nie mogą się zapisać.`,
        action: 'Sprawdź tablet', onFix: fix,
      });
    }
    if (!t.name && t.location_id === null) {
      tabletIssues.push({
        key: `setup-${t.id}`, icon: 'tablet',
        title: 'Nowy tablet nie ma nazwy ani lokalizacji',
        text: 'Nadaj mu nazwę i przypisz lokalizację, żeby kiosk pokazał kolejkę.',
        action: 'Skonfiguruj tablet', onFix: fix,
      });
    } else if (!t.name) {
      tabletIssues.push({
        key: `noname-${t.id}`, icon: 'tablet',
        title: 'Tablet nie ma nazwy',
        text: 'Nadaj nazwę, żeby łatwo rozpoznać go na liście i w alertach.',
        action: 'Nadaj nazwę', onFix: fix,
      });
    } else if (t.location_id === null) {
      tabletIssues.push({
        key: `noloc-${t.id}`, icon: 'tablet',
        title: `Tablet ${label} nie ma lokalizacji`,
        text: 'Kiosk nie pokazuje żadnej kolejki, dopóki go nie przypiszesz.',
        action: 'Przypisz lokalizację', onFix: fix,
      });
    }
  }
  for (const l of sortByName(activeLocations, l => l.name)) {
    if (!l.tablet) {
      issues.push({
        key: `nokiosk-${l.id}`, icon: 'pin',
        title: `${l.name} nie ma kiosku`,
        text: 'Lokalizacja jest aktywna, ale nikt nie może do niej dołączyć.',
        action: 'Przypisz tablet', onFix: () => onNavigate('lokalizacje', { editId: l.id }),
      });
    }
    if (l.user_ids.length === 0) {
      issues.push({
        key: `noop-${l.id}`, icon: 'users',
        title: `${l.name} nie ma operatora`,
        text: 'Bez przypisanej osoby nikt nie wezwie oczekujących.',
        action: 'Przypisz operatora', onFix: () => onNavigate('lokalizacje', { editId: l.id }),
      });
    }
  }
  issues.push(...tabletIssues);

  const sortedLocations = [...sortByName(activeLocations, l => l.name), ...sortByName(locations.filter(l => !l.is_active), l => l.name)];

  return (
    <>
      <dl className="summary-line">
        <div><dd>{waitingTotal}</dd><dt>{plural(waitingTotal, ['osoba czeka', 'osoby czekają', 'osób czeka'])} teraz</dt></div>
        <div><dd>{onlineKiosks} z {activeTablets.length}</dd><dt>{activeTablets.length === 1 ? 'kiosku online' : 'kiosków online'}</dt></div>
        <div><dd>{onlineOperators}</dd><dt>{plural(onlineOperators, ['operator online', 'operatorzy online', 'operatorów online'])}</dt></div>
      </dl>

      <section className="section" aria-labelledby="attention-title">
        <h2 className="section-title" id="attention-title">Wymaga uwagi</h2>
        <ul className="attention">
          {issues.length === 0 ? (
            <li className="attention-item">
              <span className="attention-ico is-ok"><Icon name="check" /></span>
              <div className="attention-txt">
                <b>Wszystko działa</b>
                <span>Aktywne lokalizacje mają kiosk i operatora, a kioski są online.</span>
              </div>
            </li>
          ) : issues.map(issue => (
            <li key={issue.key} className="attention-item">
              <span className="attention-ico is-warn"><Icon name={issue.icon} /></span>
              <div className="attention-txt">
                <b>{issue.title}</b>
                <span>{issue.text}</span>
              </div>
              <Button size="sm" onClick={issue.onFix}>{issue.action}</Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="locations-now-title">
        <h2 className="section-title" id="locations-now-title">Lokalizacje teraz</h2>
        {locations.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="pin"
              title="Nie ma jeszcze lokalizacji"
              text="Dodaj pierwszą lokalizację, przypisz jej tablet i operatora — wtedy klienci mogą dołączać do kolejki."
              action={<Button variant="primary" icon="plus" onClick={() => onNavigate('lokalizacje', { add: true })}>Dodaj lokalizację</Button>}
            />
          </div>
        ) : (
          <div className="dtable-wrap">
            <table className="dtable">
              <thead>
                <tr><th>Lokalizacja</th><th>Teraz obsługiwany</th><th>Czeka</th><th>Najdłużej</th><th>Kiosk</th><th>Zapisy</th></tr>
              </thead>
              <tbody>
                {sortedLocations.map(loc => {
                  const q = loc.is_active ? queues[loc.id] : undefined;
                  const longest = q?.waiting[0] ? minutesSince(q.waiting[0].joined_at) : null;
                  const tablet = loc.tablet ? tabletById.get(loc.tablet.id) : undefined;
                  const open = () => onNavigate('lokalizacje', { editId: loc.id });
                  return (
                    <tr
                      key={loc.id}
                      className={loc.is_active ? 'is-clickable' : 'is-clickable is-off'}
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={e => { if (e.key === 'Enter') open(); }}
                      title="Otwórz ustawienia lokalizacji"
                    >
                      <td><div className="cell-main"><QueueLetter letter={loc.queue_code} off={!loc.is_active} /><b>{loc.name}</b></div></td>
                      <td>{q?.serving ? <TicketCode code={q.serving.ticket_code} state="called" /> : <span className="muted">Nikt</span>}</td>
                      <td className="num">{q ? q.waiting.length : '–'}</td>
                      <td className="num">
                        {longest === null ? <span className="muted">–</span> : <span className={longest >= LONG_WAIT_MIN ? 'text-warn' : undefined}>{longest} min</span>}
                      </td>
                      <td>
                        {!loc.tablet ? <StatusPill tone="offline">Brak kiosku</StatusPill>
                          : !loc.tablet.is_active ? <StatusPill tone="offline">Dezaktywowany</StatusPill>
                          : tablet?.online ? <StatusPill tone="online">Online</StatusPill>
                          : <StatusPill tone="offline">Offline</StatusPill>}
                      </td>
                      <td>
                        {!loc.is_active ? <StatusPill tone="offline">Dezaktywowana</StatusPill>
                          : loc.accepting_new_tickets ? <StatusPill tone="neutral">Otwarte</StatusPill>
                          : <StatusPill tone="paused">Wstrzymane</StatusPill>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
});

export default AdminHome;
