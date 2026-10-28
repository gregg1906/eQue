import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { api, ApiError } from '../lib/api';
import { ws } from '../lib/ws';
import { sortByName } from '../lib/sort';
import { formatLastSeen } from '../lib/time';
import { useTick } from '../lib/useTick';
import type { TabletResponse, LocationResponse, RefreshHandle } from '../lib/apiTypes';
import { confirmDialog } from '../lib/dialog-actions';
import { showToast } from './ui/useToast';
import Button from './ui/Button';
import Drawer from './ui/Drawer';
import { Field, Input } from './ui/Field';
import Icon from './ui/Icon';
import QueueLetter from './ui/QueueLetter';
import Segmented from './ui/Segmented';
import Select from './ui/Select';
import StatusPill from './ui/StatusPill';
import Switch from './ui/Switch';
import EmptyState from './ui/EmptyState';

type Filter = 'all' | 'active' | 'off';

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? `${fallback}: ${err.message}` : `${fallback}. Sprawdź połączenie i spróbuj ponownie.`;
}

function TabletStatus({ tablet }: { tablet: TabletResponse }) {
  if (!tablet.is_active) return <StatusPill tone="offline">Dezaktywowany</StatusPill>;
  return tablet.online ? <StatusPill tone="online">Online</StatusPill> : <StatusPill tone="offline">Offline</StatusPill>;
}

function TokenField({ token }: { token: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      showToast('Skopiowano token.');
    } catch {
      showToast('Nie udało się skopiować. Zaznacz token i skopiuj go ręcznie.', { tone: 'error' });
    }
  };

  return (
    <div className="token-row">
      <Input className="input-mono" value={token} readOnly onFocus={e => e.currentTarget.select()} />
      <Button icon="copy" onClick={copy}>Kopiuj</Button>
    </div>
  );
}

const AdminDashboard = forwardRef<RefreshHandle, {
  addOpen?: boolean;
  onAddOpen?: () => void;
  onAddClose?: () => void;
  editId?: number | null;
  onEditHandled?: () => void;
}>(function AdminDashboard({ addOpen = false, onAddOpen, onAddClose, editId = null, onEditHandled }, ref) {
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [devices, setDevices] = useState<TabletResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  useTick(60000);

  const refetch = useCallback(async () => {
    try {
      const [t, l] = await Promise.all([
        api.get<TabletResponse[]>('/admin/tablets'),
        api.get<LocationResponse[]>('/admin/locations'),
      ]);
      setDevices(t);
      setLocations(l);
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
    const offCreated = ws.on('device.created', msg => {
      const tablet = msg.tablet as TabletResponse;
      setDevices(prev => prev.some(d => d.id === tablet.id) ? prev : [...prev, tablet]);
    });
    const offUpdated = ws.on('device.updated', msg => {
      const tablet = msg.tablet as TabletResponse;
      setDevices(prev => prev.map(d => d.id === tablet.id ? tablet : d));
    });
    const offDeleted = ws.on('device.deleted', msg => {
      const tabletId = msg.tablet_id as number;
      setDevices(prev => prev.filter(d => d.id !== tabletId));
    });
    const offStatus = ws.on('device.status', msg => {
      const tabletId = msg.tablet_id as number;
      const online = msg.online as boolean;
      setDevices(prev => prev.map(d => d.id === tabletId ? { ...d, online, last_seen_at: online ? new Date().toISOString() : d.last_seen_at } : d));
    });
    return () => { offCreated(); offUpdated(); offDeleted(); offStatus(); };
  }, []);

  // ——— edycja ———
  const [editing, setEditing] = useState<TabletResponse | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const openEdit = (device: TabletResponse) => {
    setEditing({ ...device });
    setEditOpen(true);
  };

  useEffect(() => {
    if (editId === null || loading) return;
    const id = setTimeout(() => {
      const device = devices.find(d => d.id === editId);
      if (device) {
        setEditing({ ...device });
        setEditOpen(true);
      }
      onEditHandled?.();
    }, 0);
    return () => clearTimeout(id);
  }, [editId, loading, devices, onEditHandled]);

  const applyUpdated = (updated: TabletResponse) => {
    setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
    setEditing(prev => prev && prev.id === updated.id ? { ...prev, is_active: updated.is_active, location_id: updated.location_id, pairing_token: updated.pairing_token, online: updated.online } : prev);
  };

  const handleToggleActive = async (next: boolean) => {
    if (!editing) return;
    if (!next) {
      const ok = await confirmDialog(
        `Dezaktywować tablet „${editing.name || 'bez nazwy'}”? Zostanie odłączony od lokalizacji, a na jego ekranie pojawi się komunikat o wyłączeniu. Token zostaje zapamiętany, więc po ponownym włączeniu tablet wróci sam.`,
        { title: 'Dezaktywuj tablet', tone: 'danger', confirmLabel: 'Dezaktywuj' }
      );
      if (!ok) return;
    }
    try {
      const updated = await api.post<TabletResponse>(`/admin/tablets/${editing.id}/${next ? 'activate' : 'deactivate'}`);
      applyUpdated(updated);
      showToast(`${updated.is_active ? 'Aktywowano' : 'Dezaktywowano'} tablet: ${updated.name || 'bez nazwy'}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się zmienić statusu tabletu'), { tone: 'error' });
    }
  };

  const handleResetPairing = async () => {
    if (!editing) return;
    const ok = await confirmDialog(
      `Zresetować token parowania tabletu „${editing.name || 'bez nazwy'}”? Obecnie sparowane urządzenie zostanie wylogowane i trzeba będzie wpisać nowy token w aplikacji mobilnej.`,
      { title: 'Resetuj token parowania', tone: 'danger', confirmLabel: 'Resetuj' }
    );
    if (!ok) return;
    try {
      const updated = await api.post<TabletResponse>(`/admin/tablets/${editing.id}/reset-pairing`);
      applyUpdated(updated);
      showToast('Wygenerowano nowy token parowania.');
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się zresetować tokenu'), { tone: 'error' });
    }
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await api.put<TabletResponse>(`/admin/tablets/${editing.id}`, {
        name: editing.name,
        location_id: editing.location_id,
      });
      setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
      setEditOpen(false);
      showToast(`Zapisano zmiany: ${updated.name || 'tablet bez nazwy'}.`);
      refetch();
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się zapisać zmian'), { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!editing) return;
    const ok = await confirmDialog(
      `Usunąć tablet „${editing.name || 'bez nazwy'}”? Tej operacji nie można cofnąć.`,
      { title: 'Usuń tablet', tone: 'danger', confirmLabel: 'Usuń' }
    );
    if (!ok) return;
    try {
      await api.del(`/admin/tablets/${editing.id}`);
      setDevices(prev => prev.filter(d => d.id !== editing.id));
      setEditOpen(false);
      showToast(`Usunięto tablet: ${editing.name || 'bez nazwy'}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się usunąć tabletu'), { tone: 'error' });
    }
  };

  // ——— dodawanie ———
  const [createdTablet, setCreatedTablet] = useState<TabletResponse | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreateTablet = async () => {
    setCreating(true);
    try {
      const created = await api.post<TabletResponse>('/admin/tablets', { name: '', location_id: null });
      setDevices(prev => prev.some(d => d.id === created.id) ? prev : [...prev, created]);
      setCreatedTablet(created);
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się dodać tabletu'), { tone: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const closeAdd = () => {
    onAddClose?.();
    // treść panelu zmieniamy dopiero po animacji zamknięcia
    setTimeout(() => setCreatedTablet(null), 300);
  };

  const configureCreated = () => {
    if (!createdTablet) return;
    const created = devices.find(d => d.id === createdTablet.id) ?? createdTablet;
    closeAdd();
    openEdit(created);
  };

  // ——— lista ———
  const locationById = new Map(locations.map(l => [l.id, l]));
  const q = query.trim().toLowerCase();
  const visibleDevices = sortByName(
    devices.filter(d =>
      (filter === 'all' || (filter === 'active' ? d.is_active : !d.is_active)) &&
      (!q || d.name.toLowerCase().includes(q) || (d.location_id !== null && (locationById.get(d.location_id)?.name ?? '').toLowerCase().includes(q)))
    ),
    d => d.name
  );
  const editedDevice = editing ? devices.find(d => d.id === editing.id) : undefined;

  return (
    <>
      <div className="filters">
        <div className="search">
          <Icon name="search" />
          <Input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj po nazwie lub lokalizacji" aria-label="Szukaj tabletów" />
        </div>
        <Segmented
          label="Filtr statusu"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Wszystkie' },
            { value: 'active', label: 'Aktywne' },
            { value: 'off', label: 'Dezaktywowane' },
          ]}
        />
      </div>

      <div className="dtable-wrap">
        <table className="dtable">
          <thead>
            <tr><th>Tablet</th><th>Lokalizacja</th><th>Status</th></tr>
          </thead>
          <tbody>
            {!loading && visibleDevices.length === 0 && (
              <tr>
                <td colSpan={3} className="cell-empty">
                  {devices.length === 0 ? (
                    <EmptyState
                      icon="tablet"
                      title="Nie ma jeszcze tabletów"
                      text="Tablet w lokalizacji działa jako kiosk: pokazuje kod zapisu i numer wzywanej osoby."
                      action={<Button variant="primary" icon="plus" onClick={onAddOpen}>Dodaj tablet</Button>}
                    />
                  ) : (
                    <EmptyState title="Brak pasujących tabletów" text="Zmień wyszukiwaną frazę albo filtr statusu." />
                  )}
                </td>
              </tr>
            )}
            {visibleDevices.map(device => {
              const location = device.location_id !== null ? locationById.get(device.location_id) : undefined;
              return (
                <tr
                  key={device.id}
                  className={device.is_active ? 'is-clickable' : 'is-clickable is-off'}
                  tabIndex={0}
                  onClick={() => openEdit(device)}
                  onKeyDown={e => { if (e.key === 'Enter') openEdit(device); }}
                >
                  <td>
                    <div className="cell-main">
                      <span className={device.is_active ? 'tile' : 'tile is-off'}><Icon name="tablet" /></span>
                      {device.name
                        ? <b>{device.name}</b>
                        : <b className="text-warn">Bez nazwy</b>}
                    </div>
                  </td>
                  <td>
                    {location
                      ? <div className="cell-main"><QueueLetter letter={location.queue_code} off={!location.is_active} /><span>{location.name}</span></div>
                      : <span className="muted">Nieprzypisany</span>}
                  </td>
                  <td>
                    <div className="cell-stack">
                      <TabletStatus tablet={device} />
                      <span className="cell-sub">{device.online ? 'Aktywny teraz' : formatLastSeen(device.last_seen_at)}</span>
                    </div>
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
        title={createdTablet ? 'Tablet utworzony' : 'Dodaj nowy tablet'}
        leading={<span className="tile"><Icon name="tablet" /></span>}
        footer={createdTablet ? <>
          <Button onClick={configureCreated}>Ustaw nazwę i lokalizację</Button>
          <span className="grow" />
          <Button variant="primary" onClick={closeAdd}>Gotowe</Button>
        </> : <>
          <Button onClick={closeAdd}>Anuluj</Button>
          <span className="grow" />
          <Button variant="primary" onClick={handleCreateTablet} disabled={creating}>
            {creating ? 'Tworzenie…' : 'Utwórz tablet'}
          </Button>
        </>}
      >
        {createdTablet ? (
          <>
            <p className="step-done"><Icon name="check" />Tablet jest gotowy do sparowania.</p>
            <Field label="Token parowania" hint="Wpisz go w aplikacji mobilnej na tablecie, w zakładce „Konfiguracja kiosku”.">
              <TokenField token={createdTablet.pairing_token ?? ''} />
            </Field>
            <div className="note">
              <Icon name="info" />
              <span>Następnie nadaj tabletowi nazwę i przypisz lokalizację — dopiero wtedy kiosk pokaże kolejkę.</span>
            </div>
          </>
        ) : (
          <p className="m-0">
            Wygenerujemy token parowania. Wpiszesz go w aplikacji mobilnej na tablecie, w zakładce „Konfiguracja kiosku”.
          </p>
        )}
      </Drawer>

      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editedDevice?.name || editing?.name || 'Tablet bez nazwy'}
        leading={editing && <span className={editing.is_active ? 'tile' : 'tile is-off'}><Icon name="tablet" /></span>}
        footer={<>
          <Button onClick={() => setEditOpen(false)}>Anuluj</Button>
          <span className="grow" />
          <Button variant="primary" onClick={() => handleSaveEdit()} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        </>}
      >
        {editing && (
          <form className="contents" onSubmit={handleSaveEdit}>
            <div className="drawer-hero">
              <TabletStatus tablet={editedDevice ?? editing} />
              <span>{(editedDevice ?? editing).online ? 'Aktywny teraz' : formatLastSeen((editedDevice ?? editing).last_seen_at)}</span>
            </div>

            <Field label="Nazwa urządzenia" hint="Np. miejsce, w którym stoi tablet.">
              <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="np. Tablet hol główny" />
            </Field>

            <Field label="Lokalizacja" hint={!editing.is_active ? 'Aktywuj tablet, aby przypisać go do lokalizacji.' : undefined}>
              <Select
                value={editing.location_id !== null ? String(editing.location_id) : ''}
                disabled={!editing.is_active}
                onChange={v => setEditing({ ...editing, location_id: v ? Number(v) : null })}
                placeholder="Nieprzypisany do żadnej lokalizacji"
                options={[
                  { value: '', label: 'Nieprzypisany do żadnej lokalizacji' },
                  ...sortByName(locations.filter(loc => loc.is_active), l => l.name).map(loc => {
                    const occupant = devices.find(d => d.location_id === loc.id && d.id !== editing.id);
                    return {
                      value: String(loc.id),
                      label: `${loc.name}${occupant ? ` (zastąpi: ${occupant.name || 'tablet bez nazwy'})` : ''}`,
                    };
                  }),
                ]}
              />
            </Field>

            {editing.pairing_token && (
              <Field label="Token parowania" hint="Wpisz go w aplikacji mobilnej, w zakładce „Konfiguracja kiosku”.">
                <TokenField token={editing.pairing_token} />
              </Field>
            )}

            <div className="drawer-section">
              <div className="toggle-row">
                <div className="toggle-row-text">
                  <b>Tablet aktywny</b>
                  <span>
                    {editing.is_active
                      ? 'Dezaktywowany tablet pokazuje komunikat o wyłączeniu i jest odłączony od lokalizacji.'
                      : 'Po aktywacji tablet wróci sam — token jest zapamiętany.'}
                  </span>
                </div>
                <Switch checked={editing.is_active} onChange={handleToggleActive} label="Tablet aktywny" />
              </div>
            </div>

            {editing.pairing_token && (
              <div className="drawer-section">
                <h3 className="drawer-section-title">Resetuj token parowania</h3>
                <p className="drawer-section-text">Wyloguje obecnie sparowane urządzenie — trzeba będzie wpisać nowy token ręcznie.</p>
                <Button variant="danger" size="sm" className="self-start" onClick={handleResetPairing}>Resetuj token</Button>
              </div>
            )}

            <div className="drawer-section">
              <h3 className="drawer-section-title">Usuń tablet</h3>
              <p className="drawer-section-text">Usuwa tablet z systemu. Tego nie da się cofnąć, więc zapytamy jeszcze raz.</p>
              <Button variant="danger" size="sm" className="self-start" onClick={handleDeleteDevice}>Usuń tablet</Button>
            </div>
            <button type="submit" hidden />
          </form>
        )}
      </Drawer>
    </>
  );
});

export default AdminDashboard;
