import { useState } from 'react';

interface Location {
  id: string;
  name: string;
  description: string;
  userIds: string[];
  active: boolean;
}

interface UserData {
  id: string;
  fullName: string;
  locationIds: string[];
}

interface Device {
  id: string;
  name: string;
  locationId: string;
}

/* ── helpers ─────────────────────────────────────────── */

function pluralOsoby(n: number) {
  if (n === 1) return 'osoba';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'osoby';
  return 'osób';
}

/* ── sub-components ───────────────────────────────────── */

function LocationIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z" /><circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function StatusBadge({ tone, children }: { tone: 'success' | 'neutral'; children: React.ReactNode }) {
  const map = {
    success: { fg: 'var(--green-700)', bg: 'var(--green-50)', bd: 'var(--green-100)', dot: 'var(--green-600)' },
    neutral: { fg: 'var(--slate-700)', bg: 'var(--slate-100)', bd: 'var(--slate-200)', dot: 'var(--slate-500)' },
  } as const;
  const c = map[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
      padding: '3px 10px', borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
      background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {children}
    </span>
  );
}

function Switch({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel: string }) {
  const w = 44, h = 24, k = 18;
  return (
    <button
      role="switch" aria-checked={checked} aria-label={ariaLabel}
      onClick={onChange}
      style={{
        position: 'relative', width: w, height: h, flexShrink: 0,
        borderRadius: 'var(--radius-pill)', border: 'none', padding: 0,
        background: checked ? 'var(--brand)' : 'var(--slate-300)',
        cursor: 'pointer', transition: 'background var(--dur-base) var(--ease-out)',
      }}
    >
      <span style={{
        position: 'absolute', top: (h - k) / 2,
        left: checked ? w - k - (h - k) / 2 : (h - k) / 2,
        width: k, height: k, borderRadius: '50%', background: '#fff',
        boxShadow: 'var(--shadow-sm)', transition: 'left var(--dur-base) var(--ease-out)',
      }} />
    </button>
  );
}

/* ── slide panel (matches AdminUsers / AdminDashboard) ── */

function SlidePanel({ title, open, onClose, children, footer }: {
  title: string; open: boolean; onClose: () => void;
  children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <>
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(12,16,19,0.45)' }} onClick={onClose} />}
      <aside style={{
        position: 'fixed', inset: '0 0 0 auto', zIndex: 50,
        width: '100%', maxWidth: 440,
        background: 'var(--surface-card)',
        boxShadow: '0 18px 48px rgba(21,27,31,0.16)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 250ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--text-strong)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', padding: 4, borderRadius: 'var(--radius-sm)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>{children}</div>
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: 10, background: 'var(--surface-sunken)' }}>
          {footer}
        </div>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/* ── shared styles ─────────────────────────────────────── */

const btnPrimary: React.CSSProperties = {
  background: 'var(--brand)', color: 'var(--on-brand)', border: 'none',
  borderRadius: 'var(--radius-md)', padding: '10px 20px',
  fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 14.5, cursor: 'pointer',
};
const btnDanger: React.CSSProperties = {
  background: 'var(--red-50)', color: 'var(--red-600)', border: '1.5px solid var(--red-100)',
  borderRadius: 'var(--radius-md)', padding: '10px 20px',
  fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14.5, cursor: 'pointer',
};
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--border-default)',
  borderRadius: 'var(--radius-md)', padding: '11px 14px',
  fontFamily: 'var(--font-ui)', fontSize: 15,
  color: 'var(--text-strong)', background: 'var(--surface-card)',
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 7,
  fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
  color: 'var(--text-body)',
};

/* ── main component ───────────────────────────────────── */

export default function AdminLocations({ addOpen = false, onAddClose }: { addOpen?: boolean; onAddClose?: () => void }) {
  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem('eque_devices');
    return saved ? JSON.parse(saved) : [];
  });

  const [users, setUsers] = useState<UserData[]>(() => {
    const savedUsers = localStorage.getItem('eque_users');
    if (savedUsers) return JSON.parse(savedUsers);
    return [
      { id: 'usr1', fullName: 'Jan Kowalski', locationIds: ['loc1', 'loc3'] },
      { id: 'usr2', fullName: 'Anna Nowak', locationIds: ['loc1', 'loc2'] },
      { id: 'usr3', fullName: 'Piotr Wiśniewski', locationIds: ['loc3'] },
    ];
  });

  const [locations, setLocations] = useState<Location[]>(() => {
    const saved = localStorage.getItem('eque_locations');
    const parsed: Location[] = saved ? JSON.parse(saved) : [
      { id: 'loc1', name: 'Hol Główny', description: 'Parter, przy wejściu A', userIds: ['usr1', 'usr2'], active: true },
      { id: 'loc2', name: 'Okienko Rejestracji 1', description: 'Parter, skrzydło wschodnie', userIds: ['usr2'], active: true },
      { id: 'loc3', name: 'Gabinet Kardiologiczny 12', description: 'Piętro 2', userIds: ['usr1', 'usr3'], active: true },
    ];
    return parsed.map(l => ({ ...l, active: l.active ?? true }));
  });

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingTabletId, setEditingTabletId] = useState<string>('');

  const saveLocations = (updated: Location[]) => {
    setLocations(updated);
    localStorage.setItem('eque_locations', JSON.stringify(updated));
  };
  const saveUsers = (updated: UserData[]) => {
    setUsers(updated);
    localStorage.setItem('eque_users', JSON.stringify(updated));
  };
  const saveDevices = (updated: Device[]) => {
    setDevices(updated);
    localStorage.setItem('eque_devices', JSON.stringify(updated));
  };

  const openEditLocation = (location: Location) => {
    setEditingLocation({ ...location });
    setEditingTabletId(devices.find(d => d.locationId === location.id)?.id ?? '');
  };

  const handleToggleActive = (location: Location) => {
    saveLocations(locations.map(l => l.id === location.id ? { ...l, active: !l.active } : l));
  };

  const handleAddLocation = () => {
    if (!newName.trim()) return;
    const newLocation: Location = {
      id: Date.now().toString(),
      name: newName,
      description: newDescription.trim() ? newDescription : 'Brak opisu',
      userIds: [],
      active: true,
    };
    saveLocations([...locations, newLocation]);
    onAddClose?.();
    setNewName('');
    setNewDescription('');
  };

  const handleDeleteLocation = () => {
    if (!editingLocation) return;
    if (!window.confirm(`Czy na pewno chcesz usunąć lokalizację "${editingLocation.name}"? Tej operacji nie można cofnąć.`)) return;

    saveLocations(locations.filter(l => l.id !== editingLocation.id));
    saveUsers(users.map(u => ({ ...u, locationIds: (u.locationIds || []).filter(id => id !== editingLocation.id) })));
    saveDevices(devices.map(d => d.locationId === editingLocation.id ? { ...d, locationId: '' } : d));
    setEditingLocation(null);
  };

  const handleSaveEdit = () => {
    if (!editingLocation) return;

    saveLocations(locations.map(l => l.id === editingLocation.id ? editingLocation : l));

    saveUsers(users.map(u => {
      const filteredLocs = (u.locationIds || []).filter(id => id !== editingLocation.id);
      if (editingLocation.userIds.includes(u.id)) filteredLocs.push(editingLocation.id);
      return { ...u, locationIds: Array.from(new Set(filteredLocs)) };
    }));

    /* only one tablet may belong to a location */
    saveDevices(devices.map(d => {
      if (d.id === editingTabletId) return { ...d, locationId: editingLocation.id };
      if (d.locationId === editingLocation.id) return { ...d, locationId: '' };
      return d;
    }));

    setEditingLocation(null);
  };

  const tabletForLocation = (locId: string) => devices.find(d => d.locationId === locId);

  /* ── render ────────────────────────────────────────── */
  return (
    <div>
      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.3fr 1fr 96px',
          gap: 12, padding: '12px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-faint)',
        }}>
          <span>Lokalizacja</span><span>Tablet</span><span>Użytkownicy</span><span>Status</span><span></span>
        </div>

        {locations.length === 0 && (
          <div style={{ padding: 36, textAlign: 'center', fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', fontSize: 15 }}>
            Brak dodanych lokalizacji.
          </div>
        )}

        {locations.map((location, i) => {
          const tablet = tabletForLocation(location.id);
          const userCount = (location.userIds ?? []).length;

          return (
            <div
              key={location.id}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.3fr 1fr 96px',
                gap: 12, alignItems: 'center', padding: '17px 24px',
                background: location.active ? 'transparent' : 'var(--surface-sunken)',
                borderBottom: i < locations.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                transition: 'background var(--dur-base) var(--ease-out)',
              }}
            >
              {/* Icon + name + description */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: location.active ? 'var(--brand-subtle)' : 'var(--surface-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: location.active ? 'var(--text-brand)' : 'var(--text-faint)',
                }}>
                  <LocationIcon size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 15.5, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {location.name}
                  </div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {location.description}
                  </div>
                </div>
              </div>

              {/* Tablet */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={tablet ? 'var(--text-muted)' : 'var(--text-faint)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span style={{
                  fontFamily: 'var(--font-ui)', fontSize: 13.5,
                  color: tablet ? 'var(--text-body)' : 'var(--text-faint)',
                  fontStyle: tablet ? 'normal' : 'italic',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {tablet ? (tablet.name || 'Tablet bez nazwy') : 'Brak przypisanego'}
                </span>
              </div>

              {/* Users */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-muted)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5 }}>{userCount} {pluralOsoby(userCount)}</span>
              </div>

              {/* Status */}
              <div>
                <StatusBadge tone={location.active ? 'success' : 'neutral'}>
                  {location.active ? 'Aktywna' : 'Dezaktywowana'}
                </StatusBadge>
              </div>

              {/* Actions: deactivate switch + edit */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                <Switch
                  checked={location.active}
                  onChange={() => handleToggleActive(location)}
                  ariaLabel={location.active ? `Dezaktywuj lokalizację ${location.name}` : `Aktywuj lokalizację ${location.name}`}
                />
                <button
                  onClick={() => openEditLocation(location)}
                  title="Edytuj"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    transition: 'background var(--dur-fast), color var(--dur-fast)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-sunken)'; e.currentTarget.style.color = 'var(--text-body)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-faint)'; }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add panel ─────────────────────────────────── */}
      <SlidePanel title="Nowa lokalizacja" open={addOpen} onClose={() => onAddClose?.()} footer={
        <>
          <button style={btnPrimary} onClick={handleAddLocation}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; }}>
            Dodaj
          </button>
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="Nazwa lokalizacji">
            <input style={inputStyle} type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="np. Gabinet 12"
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--focus-ring)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }} />
          </Field>
          <Field label="Opis (opcjonalnie)">
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={newDescription} onChange={e => setNewDescription(e.target.value)}
              placeholder="np. Piętro 1, skrzydło wschodnie"
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--focus-ring)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }} />
          </Field>
        </div>
      </SlidePanel>

      {/* ── Edit panel ────────────────────────────────── */}
      <SlidePanel title="Edytuj lokalizację" open={!!editingLocation} onClose={() => setEditingLocation(null)} footer={
        <>
          <button style={btnDanger} onClick={handleDeleteLocation}>Usuń</button>
          <button style={{ ...btnPrimary, marginLeft: 'auto' }} onClick={handleSaveEdit}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; }}>
            Zapisz
          </button>
        </>
      }>
        {editingLocation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: editingLocation.active ? 'var(--brand-subtle)' : 'var(--surface-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: editingLocation.active ? 'var(--text-brand)' : 'var(--text-faint)',
              }}>
                <LocationIcon size={22} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)' }}>
                  {editingLocation.name || '—'}
                </div>
                <div style={{ marginTop: 5 }}>
                  <StatusBadge tone={editingLocation.active ? 'success' : 'neutral'}>
                    {editingLocation.active ? 'Aktywna' : 'Dezaktywowana'}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <Field label="Nazwa lokalizacji">
              <input style={inputStyle} type="text" value={editingLocation.name}
                onChange={e => setEditingLocation({ ...editingLocation, name: e.target.value })}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--focus-ring)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }} />
            </Field>

            <Field label="Opis">
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={editingLocation.description}
                onChange={e => setEditingLocation({ ...editingLocation, description: e.target.value })}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--focus-ring)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }} />
            </Field>

            <Field label="Przypisany tablet">
              <select style={inputStyle} value={editingTabletId} onChange={e => setEditingTabletId(e.target.value)}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--focus-ring)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}>
                <option value="">Brak przypisanego tabletu</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name || 'Tablet bez nazwy'}{d.locationId && d.locationId !== editingLocation.id ? ' (przypisany gdzie indziej)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Przypisani użytkownicy">
              <div style={{ border: '1.5px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {users.map((user, i) => (
                  <label key={user.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: i < users.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    background: editingLocation.userIds.includes(user.id) ? 'var(--brand-subtle)' : 'transparent',
                  }}>
                    <input type="checkbox"
                      checked={editingLocation.userIds.includes(user.id)}
                      onChange={e => {
                        const ids = e.target.checked
                          ? [...editingLocation.userIds, user.id]
                          : editingLocation.userIds.filter(id => id !== user.id);
                        setEditingLocation({ ...editingLocation, userIds: ids });
                      }}
                      style={{ accentColor: 'var(--brand)', width: 16, height: 16 }} />
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14.5, fontWeight: 600, color: 'var(--text-body)' }}>{user.fullName}</span>
                  </label>
                ))}
                {users.length === 0 && (
                  <div style={{ padding: 16, fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-muted)' }}>Brak dostępnych użytkowników</div>
                )}
              </div>
            </Field>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
