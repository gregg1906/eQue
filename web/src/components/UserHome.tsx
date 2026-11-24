import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { api } from '../lib/api';
import { ws, type WsMessage } from '../lib/ws';
import { sortByName } from '../lib/sort';
import { useTableSort, sortRows } from '../lib/useTableSort';
import SortHeader from './ui/SortHeader';
import { plural } from '../lib/plural';
import { minutesSince, LONG_WAIT_MIN } from '../lib/time';
import { useTick } from '../lib/useTick';
import type { LocationResponse, QueueResponse, RefreshHandle } from '../lib/apiTypes';
import { outcomeOf, useShiftHistory } from '../lib/useShiftHistory';
import Button from './ui/Button';
import Icon from './ui/Icon';
import QueueLetter from './ui/QueueLetter';
import TicketCode from './ui/TicketCode';
import StatusPill from './ui/StatusPill';
import EmptyState from './ui/EmptyState';

type HomeSortKey = 'name' | 'serving' | 'waiting' | 'longest' | 'signups';

const UserHome = forwardRef<RefreshHandle, {
  locationIds: number[];
  currentUserId: string;
  onOpenQueue: (locationId?: number) => void;
}>(function UserHome({ locationIds, currentUserId, onOpenQueue }, ref) {
  const { sort, toggle, indicator } = useTableSort<HomeSortKey>();
  const [myLocations, setMyLocations] = useState<LocationResponse[]>([]);
  const [queues, setQueues] = useState<Record<number, QueueResponse>>({});
  const [loaded, setLoaded] = useState(false);
  const { entries: history, refetch: refetchHistory } = useShiftHistory();
  useTick(30000);

  const refetch = useCallback(async () => {
    try {
      const locs = (await api.get<LocationResponse[]>('/admin/locations')).filter(l => locationIds.includes(l.id));
      setMyLocations(locs);
      const active = locs.filter(l => l.is_active);
      const entries = await Promise.all(active.map(async l => {
        const q = await api.get<QueueResponse>(`/admin/locations/${l.id}/queue`);
        return [l.id, q] as const;
      }));
      setQueues(Object.fromEntries(entries));
    } catch {
      // zachowaj ostatnio znane dane — WS dociągnie zmiany na żywo
    } finally {
      setLoaded(true);
    }
  }, [locationIds]);

  useImperativeHandle(ref, () => ({
    refetch: async () => { await Promise.all([refetch(), refetchHistory()]); },
  }), [refetch, refetchHistory]);

  useEffect(() => {
    const initial = setTimeout(refetch, 0);
    return () => clearTimeout(initial);
  }, [refetch]);

  useEffect(() => {
    const handler = (msg: WsMessage) => {
      const locId = (msg.ticket as { location_id?: number } | undefined)?.location_id;
      if (typeof locId === 'number' && locationIds.includes(locId)) refetch();
    };
    const offCreated = ws.on('ticket.created', handler);
    const offUpdated = ws.on('ticket.updated', handler);
    const offLocation = ws.on('location.updated', msg => {
      const location = msg.location as LocationResponse;
      setMyLocations(prev => prev.map(l => l.id === location.id ? location : l));
    });
    return () => { offCreated(); offUpdated(); offLocation(); };
  }, [locationIds, refetch]);

  if (!loaded) return <p className="muted" role="status">Wczytywanie pulpitu…</p>;

  if (myLocations.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon="pin"
          title="Nie masz jeszcze przypisanych lokalizacji"
          text="Poproś administratora placówki o przypisanie do lokalizacji (zakładka Użytkownicy w panelu administratora). Potem zobaczysz tu kolejki."
        />
      </div>
    );
  }

  const active = sortByName(myLocations.filter(l => l.is_active), l => l.name);
  const defaultOrder = [...active, ...sortByName(myLocations.filter(l => !l.is_active), l => l.name)];
  const queueOf = (l: LocationResponse) => (l.is_active ? queues[l.id] : undefined);
  const signupStatus = (l: LocationResponse) =>
    !l.is_active ? { tone: 'offline' as const, label: 'Dezaktywowana' }
    : l.accepting_new_tickets ? { tone: 'neutral' as const, label: 'Otwarte' }
    : { tone: 'paused' as const, label: 'Wstrzymane' };
  const sortedLocations = sortRows(defaultOrder, sort, {
    name: l => l.name,
    serving: l => queueOf(l)?.serving?.ticket_code,
    waiting: l => { const q = queueOf(l); return q ? q.waiting.length : null; },
    longest: l => { const q = queueOf(l); return q?.waiting[0] ? minutesSince(q.waiting[0].joined_at) : null; },
    signups: l => signupStatus(l).label,
  }, (a, b) => defaultOrder.indexOf(a) - defaultOrder.indexOf(b));
  const waitingTotal = active.reduce((sum, l) => sum + (queues[l.id]?.waiting.length ?? 0), 0);

  // dzisiejsze bilety zakończone przez zalogowanego operatora (z serwera)
  const mine = (history ?? []).filter(e => e.served_by_user_id === currentUserId);
  const done = mine.filter(e => outcomeOf(e) === 'served').length;
  const noShow = mine.filter(e => outcomeOf(e) === 'noshow').length;

  const longest = active
    .flatMap(l => (queues[l.id]?.waiting ?? []).map(entry => ({ entry, location: l })))
    .sort((a, b) => new Date(a.entry.joined_at).getTime() - new Date(b.entry.joined_at).getTime())
    .slice(0, 5);

  return (
    <>
      <dl className="summary-line">
        <div><dd>{waitingTotal}</dd><dt>{plural(waitingTotal, ['osoba czeka', 'osoby czekają', 'osób czeka'])} teraz</dt></div>
        <div><dd>{done}</dd><dt>obsłużono dzisiaj</dt></div>
        <div><dd>{noShow}</dd><dt>nie zgłosiło się</dt></div>
      </dl>

      <section className="section" aria-labelledby="longest-title">
        <div className="row-between flex-wrap">
          <h2 className="section-title" id="longest-title">Najdłużej czekający</h2>
          <Button size="sm" variant="ghost" icon="queue" onClick={() => onOpenQueue()}>Otwórz kolejkę</Button>
        </div>
        <ul className="attention">
          {longest.length === 0 ? (
            <li className="attention-item">
              <span className="attention-ico is-ok"><Icon name="check" /></span>
              <div className="attention-txt">
                <b>Nikt nie czeka</b>
                <span>Gdy ktoś dołączy przez kiosk w Twojej lokalizacji, pojawi się tutaj.</span>
              </div>
            </li>
          ) : longest.map(({ entry, location }) => {
            const wait = minutesSince(entry.joined_at);
            return (
              <li key={entry.id} className="attention-item">
                <TicketCode code={entry.ticket_code} />
                <div className="attention-txt">
                  <b>{entry.customer_name || 'Bez nazwiska'}</b>
                  <span>{location.name} · <span className={wait >= LONG_WAIT_MIN ? 'text-warn' : undefined}>czeka {wait} min</span></span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onOpenQueue(location.id)}>Do kolejki</Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section" aria-labelledby="my-locations-title">
        <h2 className="section-title" id="my-locations-title">Twoje lokalizacje</h2>
        <div className="dtable-wrap">
          <table className="dtable">
            <thead>
              <tr>
              <SortHeader dir={indicator('name')} onToggle={() => toggle('name')}>Lokalizacja</SortHeader>
              <SortHeader dir={indicator('serving')} onToggle={() => toggle('serving')}>Teraz obsługiwany</SortHeader>
              <SortHeader dir={indicator('waiting')} onToggle={() => toggle('waiting')}>Czeka</SortHeader>
              <SortHeader dir={indicator('longest')} onToggle={() => toggle('longest')}>Najdłużej</SortHeader>
              <SortHeader dir={indicator('signups')} onToggle={() => toggle('signups')}>Zapisy</SortHeader>
            </tr>
            </thead>
            <tbody>
              {sortedLocations.map(loc => {
                const q = loc.is_active ? queues[loc.id] : undefined;
                const wait = q?.waiting[0] ? minutesSince(q.waiting[0].joined_at) : null;
                const open = () => { if (loc.is_active) onOpenQueue(loc.id); };
                return (
                  <tr
                    key={loc.id}
                    className={loc.is_active ? 'is-clickable' : 'is-off'}
                    tabIndex={loc.is_active ? 0 : undefined}
                    onClick={open}
                    onKeyDown={e => { if (e.key === 'Enter') open(); }}
                    title={loc.is_active ? 'Przejdź do kolejki tej lokalizacji' : undefined}
                  >
                    <td><div className="cell-main"><QueueLetter letter={loc.queue_code} off={!loc.is_active} /><b>{loc.name}</b></div></td>
                    <td>{q?.serving ? <TicketCode code={q.serving.ticket_code} state="called" /> : <span className="muted">Nikt</span>}</td>
                    <td className="num">{q ? q.waiting.length : '–'}</td>
                    <td className="num">
                      {wait === null ? <span className="muted">–</span> : <span className={wait >= LONG_WAIT_MIN ? 'text-warn' : undefined}>{wait} min</span>}
                    </td>
                    <td>
                      <StatusPill tone={signupStatus(loc).tone}>{signupStatus(loc).label}</StatusPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
});

export default UserHome;
