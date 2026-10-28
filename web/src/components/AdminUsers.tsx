import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { api, ApiError } from '../lib/api';
import { ws } from '../lib/ws';
import { sortByName } from '../lib/sort';
import type { UserResponse, LocationResponse, Role, RefreshHandle } from '../lib/apiTypes';
import { confirmDialog } from '../lib/dialog-actions';
import { showToast } from './ui/useToast';
import Avatar from './ui/Avatar';
import Button from './ui/Button';
import Drawer from './ui/Drawer';
import { Field, Input } from './ui/Field';
import Icon from './ui/Icon';
import Segmented from './ui/Segmented';
import Select from './ui/Select';
import StatusPill from './ui/StatusPill';
import Switch from './ui/Switch';
import EmptyState from './ui/EmptyState';

type Filter = 'all' | 'active' | 'off';

const ROLE_OPTIONS = [
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'ADMIN', label: 'Administrator' },
];

interface AddErrors { fullName?: string; username?: string; password?: string }

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? `${fallback}: ${err.message}` : `${fallback}. Sprawdź połączenie i spróbuj ponownie.`;
}

const AdminUsers = forwardRef<RefreshHandle, {
  addOpen?: boolean;
  onAddOpen?: () => void;
  onAddClose?: () => void;
  currentUserId?: string;
}>(function AdminUsers({ addOpen = false, onAddOpen, onAddClose, currentUserId }, ref) {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const refetch = useCallback(async () => {
    try {
      const [u, l] = await Promise.all([
        api.get<UserResponse[]>('/admin/users'),
        api.get<LocationResponse[]>('/admin/locations'),
      ]);
      setUsers(u);
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
    const offPresence = ws.on('user.presence', msg => {
      const userId = msg.user_id as string;
      const online = msg.status === 'online';
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, online } : u));
    });
    const offCreated = ws.on('user.created', msg => {
      const user = msg.user as UserResponse;
      setUsers(prev => prev.some(u => u.id === user.id) ? prev : [...prev, user]);
    });
    const offUpdated = ws.on('user.updated', msg => {
      const user = msg.user as UserResponse;
      setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    });
    const offDeleted = ws.on('user.deleted', msg => {
      const userId = msg.user_id as string;
      setUsers(prev => prev.filter(u => u.id !== userId));
    });
    return () => { offPresence(); offCreated(); offUpdated(); offDeleted(); };
  }, []);

  // ——— dodawanie ———
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newRole, setNewRole] = useState<Role>('OPERATOR');
  const [newPassword, setNewPassword] = useState('');
  const [addErrors, setAddErrors] = useState<AddErrors>({});
  const [adding, setAdding] = useState(false);

  const resetAddForm = () => {
    setNewUsername(''); setNewFullName(''); setNewPosition(''); setNewRole('OPERATOR'); setNewPassword('');
    setAddErrors({});
  };

  const closeAdd = () => {
    onAddClose?.();
    resetAddForm();
  };

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const errors: AddErrors = {};
    if (!newFullName.trim()) errors.fullName = 'Wpisz imię i nazwisko, np. Anna Nowak.';
    if (!newUsername.trim()) errors.username = 'Wpisz login, np. anna.nowak.';
    else if (/\s/.test(newUsername.trim())) errors.username = 'Login nie może zawierać spacji. Użyj kropki, np. jan.kowalski.';
    if (!newPassword) errors.password = 'Ustal hasło, którym ta osoba zaloguje się pierwszy raz.';
    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAdding(true);
    try {
      const created = await api.post<UserResponse>('/admin/users', {
        username: newUsername.trim(),
        full_name: newFullName.trim(),
        position: newPosition.trim() || null,
        role: newRole,
        password: newPassword,
        location_ids: [],
      });
      setUsers(prev => prev.some(u => u.id === created.id) ? prev : [...prev, created]);
      onAddClose?.();
      resetAddForm();
      showToast(`Dodano użytkownika: ${created.full_name}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się dodać użytkownika'), { tone: 'error' });
    } finally {
      setAdding(false);
    }
  };

  // ——— edycja ———
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editErrors, setEditErrors] = useState<{ fullName?: string; username?: string }>({});
  const [saving, setSaving] = useState(false);

  const openEdit = (user: UserResponse) => {
    setEditUser({ ...user });
    setEditPassword('');
    setEditErrors({});
    setEditOpen(true);
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editUser) return;
    const errors: { fullName?: string; username?: string } = {};
    if (!editUser.full_name.trim()) errors.fullName = 'Imię i nazwisko nie może być puste.';
    if (!editUser.username.trim()) errors.username = 'Login nie może być pusty.';
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const updated = await api.put<UserResponse>(`/admin/users/${editUser.id}`, {
        username: editUser.username.trim(),
        full_name: editUser.full_name.trim(),
        position: editUser.position,
        role: editUser.role,
        password: editPassword.trim() !== '' ? editPassword : undefined,
        location_ids: editUser.location_ids,
      });
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditOpen(false);
      showToast(`Zapisano zmiany: ${updated.full_name}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się zapisać zmian'), { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editUser) return;
    const ok = await confirmDialog(
      `Usunąć użytkownika „${editUser.full_name}”? Tej operacji nie można cofnąć.`,
      { title: 'Usuń użytkownika', tone: 'danger', confirmLabel: 'Usuń' }
    );
    if (!ok) return;
    try {
      await api.del(`/admin/users/${editUser.id}`);
      setUsers(prev => prev.filter(u => u.id !== editUser.id));
      setEditOpen(false);
      showToast(`Usunięto użytkownika: ${editUser.full_name}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się usunąć użytkownika'), { tone: 'error' });
    }
  };

  const handleToggleActive = async (next: boolean) => {
    if (!editUser) return;
    if (!next) {
      const ok = await confirmDialog(
        `Dezaktywować konto „${editUser.full_name}”? Zostanie odłączone od przypisanych lokalizacji i nie będzie mogło się zalogować.`,
        { title: 'Dezaktywuj konto', tone: 'danger', confirmLabel: 'Dezaktywuj' }
      );
      if (!ok) return;
    }
    try {
      const updated = await api.post<UserResponse>(`/admin/users/${editUser.id}/${next ? 'activate' : 'deactivate'}`);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
      setEditUser(u => u && u.id === updated.id ? { ...u, is_active: updated.is_active, location_ids: updated.location_ids } : u);
      showToast(`${updated.is_active ? 'Aktywowano' : 'Dezaktywowano'} konto: ${updated.full_name}.`);
    } catch (err) {
      showToast(errorMessage(err, 'Nie udało się zmienić statusu konta'), { tone: 'error' });
    }
  };

  // ——— lista ———
  const locationById = new Map(locations.map(l => [l.id, l]));
  const q = query.trim().toLowerCase();
  const visibleUsers = sortByName(
    users.filter(u =>
      (filter === 'all' || (filter === 'active' ? u.is_active : !u.is_active)) &&
      (!q || u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    ),
    u => u.full_name
  );
  const editedUser = editUser ? users.find(u => u.id === editUser.id) : undefined;
  const assignableLocations = sortByName(locations.filter(l => l.is_active), l => l.name);

  return (
    <>
      <div className="filters">
        <div className="search">
          <Icon name="search" />
          <Input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj po imieniu lub loginie" aria-label="Szukaj użytkowników" />
        </div>
        <Segmented
          label="Filtr statusu"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Wszyscy' },
            { value: 'active', label: 'Aktywni' },
            { value: 'off', label: 'Dezaktywowani' },
          ]}
        />
      </div>

      <div className="dtable-wrap">
        <table className="dtable">
          <thead>
            <tr><th>Pracownik</th><th>Lokalizacje</th><th>Rola</th><th>Status</th></tr>
          </thead>
          <tbody>
            {!loading && visibleUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="cell-empty">
                  {users.length === 0 ? (
                    <EmptyState
                      icon="users"
                      title="Nie ma jeszcze pracowników"
                      text="Dodaj operatorów, żeby mogli obsługiwać kolejki w przypisanych lokalizacjach."
                      action={<Button variant="primary" icon="plus" onClick={onAddOpen}>Dodaj użytkownika</Button>}
                    />
                  ) : (
                    <EmptyState title="Brak pasujących pracowników" text="Zmień wyszukiwaną frazę albo filtr statusu." />
                  )}
                </td>
              </tr>
            )}
            {visibleUsers.map(user => {
              const locNames = user.location_ids.map(id => locationById.get(id)?.name).filter(Boolean) as string[];
              return (
                <tr
                  key={user.id}
                  className={user.is_active ? 'is-clickable' : 'is-clickable is-off'}
                  tabIndex={0}
                  onClick={() => openEdit(user)}
                  onKeyDown={e => { if (e.key === 'Enter') openEdit(user); }}
                >
                  <td>
                    <div className="cell-main">
                      <Avatar name={user.full_name} online={user.online} active={user.is_active} size={36} tone="auto" />
                      <div className="min-w-0">
                        <b>
                          {user.full_name}
                          {user.id === currentUserId && <span className="tag-you">Ty</span>}
                        </b>
                        <span className="cell-sub">{user.position || `@${user.username}`}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {user.role === 'ADMIN'
                      ? <span className="muted inline-flex items-center gap-1.5"><Icon name="shield" size={16} />Dostęp globalny</span>
                      : locNames.length > 0
                        ? <span className="cell-truncate">{locNames.join(', ')}</span>
                        : <span className="muted">Brak</span>}
                  </td>
                  <td><StatusPill tone="neutral">{user.role === 'ADMIN' ? 'Administrator' : 'Operator'}</StatusPill></td>
                  <td>
                    {!user.is_active ? <StatusPill tone="offline">Dezaktywowany</StatusPill>
                      : user.online ? <StatusPill tone="online">Online</StatusPill>
                      : <StatusPill tone="offline">Offline</StatusPill>}
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
        title="Nowy użytkownik"
        footer={<>
          <Button onClick={closeAdd}>Anuluj</Button>
          <span className="grow" />
          <Button variant="primary" onClick={() => handleAdd()} disabled={adding}>
            {adding ? 'Dodawanie…' : 'Dodaj użytkownika'}
          </Button>
        </>}
      >
        <form className="contents" onSubmit={handleAdd}>
          <Field label="Imię i nazwisko" error={addErrors.fullName}>
            <Input value={newFullName} onChange={e => setNewFullName(e.target.value)} placeholder="np. Anna Nowak" autoComplete="off" />
          </Field>
          <Field label="Login" error={addErrors.username} hint="Bez spacji, np. anna.nowak.">
            <Input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="np. anna.nowak" autoComplete="off" />
          </Field>
          <Field label="Stanowisko (opcjonalnie)">
            <Input value={newPosition} onChange={e => setNewPosition(e.target.value)} placeholder="np. Rejestratorka" />
          </Field>
          <Field label="Rola">
            <Select value={newRole} onChange={v => setNewRole(v as Role)} options={ROLE_OPTIONS} />
          </Field>
          <Field label="Hasło" error={addErrors.password} hint="Przekaż je tej osobie — zmieni je w Ustawieniach.">
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          <button type="submit" hidden />
        </form>
      </Drawer>

      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editedUser?.full_name ?? editUser?.full_name ?? 'Użytkownik'}
        leading={editUser && <Avatar name={editUser.full_name || '?'} online={editedUser?.online ?? editUser.online} active={editUser.is_active} size={36} tone="auto" />}
        footer={<>
          <Button onClick={() => setEditOpen(false)}>Anuluj</Button>
          <span className="grow" />
          <Button variant="primary" onClick={() => handleSaveEdit()} disabled={saving}>
            {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
          </Button>
        </>}
      >
        {editUser && (
          <form className="contents" onSubmit={handleSaveEdit}>
            <Field label="Imię i nazwisko" error={editErrors.fullName}>
              <Input value={editUser.full_name} onChange={e => setEditUser({ ...editUser, full_name: e.target.value })} />
            </Field>
            <Field label="Login" error={editErrors.username}>
              <Input value={editUser.username} onChange={e => setEditUser({ ...editUser, username: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Stanowisko">
              <Input value={editUser.position ?? ''} onChange={e => setEditUser({ ...editUser, position: e.target.value })} placeholder="np. Rejestratorka" />
            </Field>
            <Field label="Rola">
              <Select
                value={editUser.role}
                onChange={v => {
                  const role = v as Role;
                  setEditUser({ ...editUser, role, location_ids: role === 'ADMIN' ? [] : editUser.location_ids });
                }}
                options={ROLE_OPTIONS}
              />
            </Field>
            <Field label="Nowe hasło" hint="Zostaw puste, żeby nie zmieniać.">
              <Input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} autoComplete="new-password" />
            </Field>

            {editUser.role === 'OPERATOR' ? (
              editUser.is_active ? (
                <Field label="Przypisane lokalizacje" as="group">
                  <div className="checklist">
                    {assignableLocations.map(loc => (
                      <label key={loc.id}>
                        <input
                          type="checkbox"
                          checked={editUser.location_ids.includes(loc.id)}
                          onChange={e => {
                            const ids = e.target.checked
                              ? [...editUser.location_ids, loc.id]
                              : editUser.location_ids.filter(id => id !== loc.id);
                            setEditUser({ ...editUser, location_ids: ids });
                          }}
                        />
                        {loc.name}
                      </label>
                    ))}
                    {assignableLocations.length === 0 && (
                      <div className="checklist-empty">Brak aktywnych lokalizacji. Dodaj je w zakładce Lokalizacje.</div>
                    )}
                  </div>
                </Field>
              ) : (
                <div className="note"><Icon name="info" /><span>Konto jest dezaktywowane. Aktywuj je poniżej, żeby przypisać lokalizacje.</span></div>
              )
            ) : (
              <div className="note"><Icon name="shield" /><span>Administratorzy mają dostęp do wszystkich lokalizacji. Przypisanie do konkretnych lokalizacji nie dotyczy tej roli.</span></div>
            )}

            <div className="drawer-section">
              <div className="toggle-row">
                <div className="toggle-row-text">
                  <b>Konto aktywne</b>
                  <span>
                    {editUser.is_active
                      ? 'Dezaktywowane konto nie może się zalogować i traci przypisania.'
                      : 'Po aktywacji ta osoba znowu może się zalogować.'}
                  </span>
                </div>
                <Switch checked={editUser.is_active} onChange={handleToggleActive} label="Konto aktywne" />
              </div>
            </div>

            <div className="drawer-section">
              <h3 className="drawer-section-title">Usuń użytkownika</h3>
              <p className="drawer-section-text">Usuwa konto na stałe. Tego nie da się cofnąć, więc zapytamy jeszcze raz.</p>
              <Button variant="danger" size="sm" className="self-start" onClick={handleDelete}>Usuń użytkownika</Button>
            </div>
            <button type="submit" hidden />
          </form>
        )}
      </Drawer>
    </>
  );
});

export default AdminUsers;
