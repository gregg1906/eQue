import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { api, ApiError } from '../lib/api';
import { ws } from '../lib/ws';
import { sortByName } from '../lib/sort';
import { useTableSort, sortRows } from '../lib/useTableSort';
import SortHeader from './ui/SortHeader';
import type { LocationResponse, TabletResponse, UserResponse, RefreshHandle } from '../lib/apiTypes';
import { confirmDialog } from '../lib/dialog-actions';
import { showToast } from './ui/useToast';
import Button from './ui/Button';
import Drawer from './ui/Drawer';
import { Field, Input, Textarea } from './ui/Field';
import Icon from './ui/Icon';
import QueueLetter from './ui/QueueLetter';
import Select from './ui/Select';
import StatusPill from './ui/StatusPill';
import Switch from './ui/Switch';
import EmptyState from './ui/EmptyState';


interface LocationDraft {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  queue_code: string;
  tablet_id: number | null;
  user_ids: string[];
}

function toDraft(location: LocationResponse): LocationDraft {
  return {
    id: location.id,
    name: location.name,
    description: location.description ?? '',
    is_active: location.is_active,
    queue_code: location.queue_code,
    tablet_id: location.tablet?.id ?? null,
    user_ids: [...location.user_ids],
  };
}

type LocationSortKey = 'name' | 'kiosk' | 'operators' | 'status';

function locationStatus(l: LocationResponse): { tone: 'offline' | 'paused' | 'online'; label: string } {
  if (!l.is_active) return { tone: 'offline', label: 'Dezaktywowana' };
  if (!l.accepting_new_tickets) return { tone: 'paused', label: 'Zapisy wstrzymane' };
  return { tone: 'online', label: 'Aktywna' };
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? `${fallback}: ${err.message}` : `${fallback}. Sprawdź połączenie i spróbuj ponownie.`;
}

const AdminLocations = forwardRef<RefreshHandle, {
  addOpen?: boolean;
  onAddOpen?: () => void;
  onAddClose?: () => void;
  editId?: number | null;
  onEditHandled?: () => void;
}>(function AdminLocations({ addOpen = false, onAddOpen, onAddClose, editId = null, onEditHandled }, ref) {
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [tablets, setTablets] = useState<TabletResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const refetch = useCallback(async () => {
    try {
      const [l, t, u] = await Promise.all([
        api.get<LocationResponse[]>('/admin/locations'),
        api.get<TabletResponse[]>('/admin/tablets'),
        api.get<UserResponse[]>('/admin/users'),
      ]);
      setLocations(l);
      setTablets(t);
      setUsers(u);
    } catch {
      // zachowaj ostatnio znane dane — WS dociągnie zmiany na żywo
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({ refetch }), [refetch]);

  useEffect(() => {
    const initial = setTimeout(refetch, 0);
    return () => clearTimeout(initial);
  }, [refetch]);

  useEffect(() => {
    const offs = [
      ws.on('location.created', msg => {
        const location = msg.location as LocationResponse;
        setLocations(prev => prev.some(l => l.id === location.id) ? prev : [...prev, location]);
      }),
      ws.on('location.updated', msg => {
        const location = msg.location as LocationResponse;
        setLocations(prev => prev.map(l => l.id === location.id ? location : l));
      }),
      ws.on('location.deleted', msg => {
        const locationId = msg.location_id as number;
        setLocations(prev => prev.filter(l => l.id !== locationId));
      }),
      ws.on('device.updated', msg => {
        const tablet = msg.tablet as TabletResponse;
        setTablets(prev => prev.map(t => t.id === tablet.id ? tablet : t));
      }),
      ws.on('device.created', msg => {
        const tablet = msg.tablet as TabletResponse;
        setTablets(prev => prev.some(t => t.id === tablet.id) ? prev : [...prev, tablet]);
      }),
      ws.on('device.deleted', msg => {
        const tabletId = msg.tablet_id as number;
        setTablets(prev => prev.filter(t => t.id !== tabletId));
      }),
      ws.on('device.status', msg => {
        const tabletId = msg.tablet_id as number;
        const online = msg.online as boolean;
        setTablets(prev => prev.map(t => t.id === tabletId ? { ...t, online } : t));
      }),
      ws.on('user.updated', msg => {
        const user = msg.user as UserResponse;
        setUsers(prev => prev.map(u => u.id === user.id ? user : u));
      }),
    ];
    return () => offs.forEach(off => off());
  }, []);

  // ——— dodawanie ———
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const closeAdd = () => {
    onAddClose?.();
    setAddError(null);
  };

  const handleAddLocation = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newName.trim()) {
      setAddError('Wpisz nazwę lokalizacji, np. Gabinet 12.');
      return;
    }
    setAdding(true);
    try {
      const created = await api.post<LocationResponse>('/admin/locations', {
        name: newName.trim(),
        description: newDescription.trim() || null,
      });
      setLocations(prev => prev.some(l => l.id === created.id) ? prev : [...prev, created]);
      onAddClose?.();
      setNewName('');
      setNewDescription('');
      setAddError(null);
      showToast(`Dodano lokalizację: ${created.name}. Kod kolejki: ${created.queue_code}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się dodać lokalizacji'), { tone: 'error' });
    } finally {
      setAdding(false);
    }
  };

  // ——— edycja ———
  const [draft, setDraft] = useState<LocationDraft | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (location: LocationResponse) => {
    setDraft(toDraft(location));
    setEditError(null);
    setEditOpen(true);
  };

  useEffect(() => {
    if (editId === null || loading) return;
    const id = setTimeout(() => {
      const location = locations.find(l => l.id === editId);
      if (location) {
        setDraft(toDraft(location));
        setEditError(null);
        setEditOpen(true);
      }
      onEditHandled?.();
    }, 0);
    return () => clearTimeout(id);
  }, [editId, loading, locations, onEditHandled]);

  const handleDeleteLocation = async () => {
    if (!draft) return;
    const ok = await confirmDialog(
      `Usunąć lokalizację „${draft.name}”? Tej operacji nie można cofnąć.`,
      { title: 'Usuń lokalizację', tone: 'danger', confirmLabel: 'Usuń' }
    );
    if (!ok) return;
    try {
      await api.del(`/admin/locations/${draft.id}`);
      setLocations(prev => prev.filter(l => l.id !== draft.id));
      setEditOpen(false);
      showToast(`Usunięto lokalizację: ${draft.name}.`);
      refetch();
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się usunąć lokalizacji'), { tone: 'error' });
    }
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft) return;
    if (!draft.name.trim()) {
      setEditError('Nazwa nie może być pusta. Wpisz np. Gabinet 12.');
      return;
    }

    // Status lokalizacji jest częścią formularza: zmiana wchodzi w życie dopiero po „Zapisz”.
    // Porównujemy z rekordem z serwera, więc ponowny zapis po częściowym błędzie nie powtarza udanego kroku.
    const stored = locations.find(l => l.id === draft.id);
    const activating = !!stored && !stored.is_active && draft.is_active;
    const deactivating = !!stored && stored.is_active && !draft.is_active;
    if (deactivating) {
      const ok = await confirmDialog(
        `Dezaktywować lokalizację „${draft.name}”? Przypisany kiosk i operatorzy zostaną od niej odłączeni.`,
        { title: 'Dezaktywuj lokalizację', tone: 'danger', confirmLabel: 'Dezaktywuj' }
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      const sync = (l: LocationResponse) => setLocations(prev => prev.map(x => x.id === l.id ? l : x));
      if (activating) sync(await api.post<LocationResponse>(`/admin/locations/${draft.id}/activate`));
      let updated = await api.put<LocationResponse>(`/admin/locations/${draft.id}`, {
        name: draft.name.trim(),
        description: draft.description,
        // dezaktywacja i tak odłącza kiosk i operatorów — nie wysyłamy ich
        ...(deactivating ? {} : { tablet_id: draft.tablet_id, user_ids: draft.user_ids }),
      });
      sync(updated);
      if (deactivating) {
        updated = await api.post<LocationResponse>(`/admin/locations/${draft.id}/deactivate`);
        sync(updated);
      }
      setEditOpen(false);
      showToast(`Zapisano zmiany: ${updated.name}.`);
      refetch();
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się zapisać zmian'), { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ——— lista ———
  const tabletById = new Map(tablets.map(t => [t.id, t]));
  const userById = new Map(users.map(u => [u.id, u]));
  const q = query.trim().toLowerCase();
  const { sort, toggle, indicator } = useTableSort<LocationSortKey>();
  const filteredLocations = sortByName(
    locations.filter(l =>
      !q || [
        l.name, l.description, l.queue_code, l.tablet?.name,
        ...l.user_ids.flatMap(id => { const u = userById.get(id); return u ? [u.full_name, u.username] : []; }),
      ].some(v => (v ?? '').toLowerCase().includes(q))
    ),
    l => l.name
  );
  const visibleLocations = sortRows(filteredLocations, sort, {
    name: l => l.name,
    kiosk: l => (l.tablet ? l.tablet.name || 'Tablet bez nazwy' : null),
    operators: l => l.user_ids.map(id => userById.get(id)?.full_name).filter(Boolean).join(', '),
    status: l => locationStatus(l).label,
  }, (a, b) => a.name.localeCompare(b.name, 'pl'));
  const editedLocation = draft ? locations.find(l => l.id === draft.id) : undefined;
  const assignableUsers = sortByName(users.filter(u => u.is_active && u.role === 'OPERATOR'), u => u.full_name);

  return (
    <>
      <div className="filters">
        <div className="search">
          <Icon name="search" />
          <Input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj po nazwie, kiosku lub operatorze" aria-label="Szukaj lokalizacji" />
        </div>
        <Button variant="primary" icon="plus" onClick={onAddOpen}>Dodaj lokalizację</Button>
      </div>

      <div className="dtable-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <SortHeader dir={indicator('name')} onToggle={() => toggle('name')}>Lokalizacja</SortHeader>
              <SortHeader dir={indicator('kiosk')} onToggle={() => toggle('kiosk')}>Kiosk</SortHeader>
              <SortHeader dir={indicator('operators')} onToggle={() => toggle('operators')}>Operatorzy</SortHeader>
              <SortHeader dir={indicator('status')} onToggle={() => toggle('status')}>Status</SortHeader>
            </tr>
          </thead>
          <tbody>
            {!loading && visibleLocations.length === 0 && (
              <tr>
                <td colSpan={4} className="cell-empty">
                  {locations.length === 0 ? (
                    <EmptyState
                      icon="pin"
                      title="Nie ma jeszcze lokalizacji"
                      text="Lokalizacja to miejsce obsługi z własną kolejką, np. rejestracja albo gabinet."
                      action={<Button variant="primary" icon="plus" onClick={onAddOpen}>Dodaj lokalizację</Button>}
                    />
                  ) : (
                    <EmptyState title="Brak pasujących lokalizacji" text="Zmień wyszukiwaną frazę." />
                  )}
                </td>
              </tr>
            )}
            {visibleLocations.map(location => {
              const tablet = location.tablet ? tabletById.get(location.tablet.id) : undefined;
              const operators = location.user_ids.map(id => userById.get(id)?.full_name).filter(Boolean) as string[];
              return (
                <tr
                  key={location.id}
                  className={location.is_active ? 'is-clickable' : 'is-clickable is-off'}
                  tabIndex={0}
                  onClick={() => openEdit(location)}
                  onKeyDown={e => { if (e.key === 'Enter') openEdit(location); }}
                >
                  <td>
                    <div className="cell-main">
                      <QueueLetter letter={location.queue_code} off={!location.is_active} />
                      <div className="min-w-0">
                        <b>{location.name}</b>
                        <span className="cell-sub">{location.description || 'Brak opisu'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {location.tablet
                      ? <StatusPill tone={tablet?.online && location.tablet.is_active ? 'online' : 'offline'} title={tablet?.online ? 'Kiosk online' : 'Kiosk offline'}>
                          {location.tablet.name || 'Tablet bez nazwy'}
                        </StatusPill>
                      : <span className="muted">Brak kiosku</span>}
                  </td>
                  <td>
                    {operators.length > 0
                      ? <span className="cell-truncate">{operators.join(', ')}</span>
                      : <span className="muted">Nikt</span>}
                  </td>
                  <td>
                    <StatusPill tone={locationStatus(location).tone}>{locationStatus(location).label}</StatusPill>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Drawer
        open={addOpen}
        onClose={closeAdd}
        title="Nowa lokalizacja"
        footer={<>
          <Button onClick={closeAdd}>Anuluj</Button>
          <span className="grow" />
          <Button variant="primary" onClick={() => handleAddLocation()} disabled={adding}>
            {adding ? 'Dodawanie…' : 'Dodaj lokalizację'}
          </Button>
        </>}
      >
        <form className="contents" onSubmit={handleAddLocation}>
          <Field label="Nazwa lokalizacji" error={addError}>
            <Input maxLength={100} value={newName} onChange={e => { setNewName(e.target.value); setAddError(null); }} placeholder="np. Gabinet 12" />
          </Field>
          <Field label="Opis (opcjonalnie)" hint="Widoczny dla operatorów, np. piętro i skrzydło.">
            <Textarea rows={2} maxLength={255} value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="np. Piętro 1, skrzydło wschodnie" />
          </Field>
          <div className="note">
            <Icon name="info" />
            <span>Kod kolejki (litera przed numerem biletu) zostanie nadany automatycznie.</span>
          </div>
          <button type="submit" hidden />
        </form>
      </Drawer>

      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editedLocation?.name ?? draft?.name ?? 'Lokalizacja'}
        leading={draft && <QueueLetter letter={draft.queue_code} off={!draft.is_active} size="lg" />}
        footer={<>
          <Button onClick={() => setEditOpen(false)}>Anuluj</Button>
          <span className="grow" />
          <Button variant="primary" onClick={() => handleSaveEdit()} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz'}
          </Button>
        </>}
      >
        {draft && (
          <form className="contents" onSubmit={handleSaveEdit}>
            <div className="note">
              <Icon name="info" />
              <span>Kod kolejki „{draft.queue_code}” jest nadawany automatycznie i się nie zmienia. Klienci widzą go przed numerem biletu.</span>
            </div>

            <Field label="Nazwa lokalizacji" error={editError}>
              <Input maxLength={100} value={draft.name} onChange={e => { setDraft({ ...draft, name: e.target.value }); setEditError(null); }} />
            </Field>

            <Field label="Opis" hint="Widoczny dla operatorów, np. piętro i skrzydło.">
              <Textarea rows={2} maxLength={255} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
            </Field>

            {draft.is_active ? (
              <>
                <Field label="Kiosk">
                  <Select
                    value={draft.tablet_id !== null ? String(draft.tablet_id) : ''}
                    onChange={v => setDraft({ ...draft, tablet_id: v ? Number(v) : null })}
                    placeholder="Brak kiosku"
                    options={[
                      { value: '', label: 'Brak kiosku' },
                      ...sortByName(tablets.filter(t => t.is_active), t => t.name).map(t => ({
                        value: String(t.id),
                        label: `${t.name || 'Tablet bez nazwy'}${t.location_id && t.location_id !== draft.id ? ' (przypisany gdzie indziej)' : ''}`,
                      })),
                    ]}
                  />
                </Field>

                <Field label="Operatorzy" as="group">
                  <div className="checklist">
                    {assignableUsers.map(user => (
                      <label key={user.id}>
                        <input
                          type="checkbox"
                          checked={draft.user_ids.includes(user.id)}
                          onChange={e => {
                            const ids = e.target.checked
                              ? [...draft.user_ids, user.id]
                              : draft.user_ids.filter(id => id !== user.id);
                            setDraft({ ...draft, user_ids: ids });
                          }}
                        />
                        {user.full_name}
                      </label>
                    ))}
                    {assignableUsers.length === 0 && (
                      <div className="checklist-empty">Brak aktywnych operatorów. Dodaj ich w zakładce Użytkownicy.</div>
                    )}
                  </div>
                </Field>
              </>
            ) : (
              <div className="note">
                <Icon name="info" />
                <span>{locations.find(l => l.id === draft.id)?.is_active ? 'Lokalizacja zostanie dezaktywowana po kliknięciu „Zapisz”, a kiosk i operatorzy zostaną od niej odłączeni.' : 'Lokalizacja jest dezaktywowana. Włącz „Lokalizacja aktywna” poniżej i zapisz, żeby przypisać kiosk i operatorów.'}</span>
              </div>
            )}

            <div className="drawer-section">
              <div className="toggle-row">
                <div className="toggle-row-text">
                  <b>Lokalizacja aktywna</b>
                  <span>
                    {draft.is_active
                      ? 'Dezaktywacja odłącza kiosk i operatorów, a klienci nie mogą dołączyć.'
                      : 'Po włączeniu i zapisaniu przypiszesz kiosk i operatorów.'}
                  </span>
                </div>
                <Switch checked={draft.is_active} onChange={is_active => setDraft({ ...draft, is_active })} label="Lokalizacja aktywna" />
              </div>
            </div>

            <div className="drawer-section">
              <h3 className="drawer-section-title">Usuń lokalizację</h3>
              <p className="drawer-section-text">Usuwa lokalizację i odłącza kiosk. Tego nie da się cofnąć, więc zapytamy jeszcze raz.</p>
              <Button variant="danger" size="sm" className="self-start" onClick={handleDeleteLocation}>Usuń lokalizację</Button>
            </div>
            <button type="submit" hidden />
          </form>
        )}
      </Drawer>
    </>
  );
});

export default AdminLocations;
