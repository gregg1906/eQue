import { useState, useEffect } from 'react';

type OnlineStatus = 'online' | 'offline';

interface Device {
  id: string;
  name: string;
  locationId: string;
  active: boolean;
}

interface Location {
  id: string;
  name: string;
}

interface SimState {
  status: OnlineStatus;
  code: string;
}

/* ── helpers ─────────────────────────────────────────── */

function randomStatus(): OnlineStatus {
  return Math.random() < 0.75 ? 'online' : 'offline';
}

function randomCode(): string {
  const letters = ['A', 'B', 'C', 'D'];
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const num = Math.floor(Math.random() * 150) + 1;
  return `${letter}-${String(num).padStart(3, '0')}`;
}

function initSim(): SimState {
  const status = randomStatus();
  return { status, code: status === 'online' ? randomCode() : '—' };
}

/* ── sub-components ───────────────────────────────────── */

function StatusBadge({ tone, children }: { tone: 'success' | 'danger' | 'neutral'; children: React.ReactNode }) {
  const map = {
    success: { fg: 'var(--green-700)', bg: 'var(--green-50)', bd: 'var(--green-100)', dot: 'var(--green-600)' },
    danger:  { fg: 'var(--red-700)',   bg: 'var(--red-50)',   bd: 'var(--red-100)',   dot: 'var(--red-600)' },
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

function EditIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
  );
}

function TabletIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

/* ── slide panel (matches AdminUsers) ─────────────────── */

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
const btnSecondary: React.CSSProperties = {
  background: 'transparent', color: 'var(--text-body)',
  border: '1.5px solid var(--border-default)',
  borderRadius: 'var(--radius-md)', padding: '10px 20px',
  fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14.5, cursor: 'pointer',
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

export default function AdminDashboard({ addOpen = false, onAddClose }: { addOpen?: boolean; onAddClose?: () => void }) {
  const [locations] = useState<Location[]>(() => {
    const saved = localStorage.getItem('eque_locations');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'loc1', name: 'Hol Główny' },
      { id: 'loc2', name: 'Okienko Rejestracji 1' },
      { id: 'loc3', name: 'Gabinet Kardiologiczny 12' },
    ];
  });

  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem('eque_devices');
    const parsed: Device[] = saved ? JSON.parse(saved) : [
      { id: 'dev1', name: 'Tablet Wejściowy', locationId: 'loc1', active: true },
      { id: 'dev2', name: 'Tablet Rejestracja', locationId: 'loc2', active: true },
      { id: 'dev3', name: 'Kiosk Kardiologia', locationId: 'loc3', active: true },
    ];
    return parsed.map(d => ({ ...d, active: d.active ?? true }));
  });

  /* simulated online/offline + current code — one random flip every 8s, active devices only */
  const [sim, setSim] = useState<Record<string, SimState>>(() =>
    Object.fromEntries(devices.map(d => [d.id, initSim()]))
  );
  useEffect(() => {
    const id = setInterval(() => {
      setSim(prev => {
        const activeDevices = devices.filter(d => d.active);
        if (activeDevices.length === 0) return prev;
        const target = activeDevices[Math.floor(Math.random() * activeDevices.length)];
        return { ...prev, [target.id]: initSim() };
      });
    }, 8000);
    return () => clearInterval(id);
  }, [devices]);

  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const saveDevices = (updated: Device[]) => {
    setDevices(updated);
    localStorage.setItem('eque_devices', JSON.stringify(updated));
  };

  const openEdit = (device: Device) => setEditingDevice({ ...device });

  const handleToggleActive = (device: Device) => {
    saveDevices(devices.map(d => d.id === device.id ? { ...d, active: !d.active } : d));
  };

  const handleSimulateScan = () => {
    const newDevice: Device = { id: Date.now().toString(), name: '', locationId: '', active: true };
    saveDevices([...devices, newDevice]);
    setSim(prev => ({ ...prev, [newDevice.id]: initSim() }));
    onAddClose?.();
  };

  const handleSaveEdit = () => {
    if (!editingDevice) return;
    saveDevices(devices.map(d => d.id === editingDevice.id ? editingDevice : d));
    setEditingDevice(null);
  };

  const handleDeleteDevice = () => {
    if (!editingDevice) return;
    if (!window.confirm(`Czy na pewno chcesz usunąć tablet "${editingDevice.name || 'bez nazwy'}"?`)) return;
    saveDevices(devices.filter(d => d.id !== editingDevice.id));
    setEditingDevice(null);
  };

  const getLocationName = (locId: string) => locations.find(l => l.id === locId)?.name ?? '';

  /* ── render ────────────────────────────────────────── */
  return (
    <div>
      {devices.length === 0 ? (
        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)', padding: 40, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--text-muted)', fontSize: 15, margin: 0 }}>Brak dodanych tabletów.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {devices.map(device => {
            const nameMissing = !device.name;
            const locMissing = !device.locationId;
            const deviceSim = sim[device.id] ?? initSim();
            const isOnline = deviceSim.status === 'online';
            const displayCode = device.active && isOnline ? deviceSim.code : '—';

            const badge = !device.active
              ? { tone: 'neutral' as const, label: 'Dezaktywowany' }
              : isOnline
                ? { tone: 'success' as const, label: 'Online' }
                : { tone: 'danger' as const, label: 'Offline' };

            return (
              <div key={device.id} style={{
                background: device.active ? 'var(--surface-card)' : 'var(--surface-sunken)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 20,
                transition: 'background var(--dur-base) var(--ease-out)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 14, minWidth: 0 }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 'var(--radius-md)', flexShrink: 0,
                      background: device.active ? 'var(--brand-subtle)' : 'var(--surface-sunken)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: device.active ? 'var(--text-brand)' : 'var(--text-faint)',
                    }}>
                      <TabletIcon />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 15.5,
                        color: nameMissing ? 'var(--red-600)' : 'var(--text-strong)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {nameMissing ? 'Nazwa nie została ustawiona' : device.name}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-ui)', fontSize: 13, marginTop: 2,
                        color: locMissing ? 'var(--red-600)' : 'var(--text-muted)',
                      }}>
                        {locMissing ? 'Brak przypisanej lokalizacji' : getLocationName(device.locationId)}
                      </div>
                    </div>
                  </div>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                    Aktualny kod:
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums' }}>
                      {displayCode}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Switch checked={device.active} onChange={() => handleToggleActive(device)} ariaLabel={device.active ? 'Dezaktywuj tablet' : 'Aktywuj tablet'} />
                    <EditIconButton onClick={() => openEdit(device)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add device modal (simulated QR scan) ─────────── */}
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(12,16,19,0.55)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 360, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', padding: 28, boxShadow: '0 18px 48px rgba(21,27,31,0.16)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-strong)', textAlign: 'center', marginBottom: 6 }}>Skonfiguruj nowe urządzenie</h3>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>
              Uruchom aplikację eQue na nowym tablecie i zeskanuj poniższy kod QR.
            </p>
            <div style={{ margin: '0 auto 28px', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border-default)', background: 'var(--surface-sunken)' }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1">
                <path d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm12 0h6v6h-6v-6z" />
              </svg>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...btnSecondary, flex: 1 }} onClick={onAddClose}>Wstecz</button>
              <button
                style={{ ...btnPrimary, flex: 1 }}
                onClick={handleSimulateScan}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand)'; }}
              >
                Zeskanowano
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit panel ────────────────────────────────── */}
      <SlidePanel title="Edytuj tablet" open={!!editingDevice} onClose={() => setEditingDevice(null)} footer={
        <>
          <button style={btnDanger} onClick={handleDeleteDevice}>Usuń</button>
          <button style={{ ...btnPrimary, marginLeft: 'auto' }} onClick={handleSaveEdit}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; }}>
            Zapisz
          </button>
        </>
      }>
        {editingDevice && (() => {
          const editSim = sim[editingDevice.id] ?? initSim();
          const editIsOnline = editSim.status === 'online';
          const editBadge = !editingDevice.active
            ? { tone: 'neutral' as const, label: 'Dezaktywowany' }
            : editIsOnline
              ? { tone: 'success' as const, label: 'Online' }
              : { tone: 'danger' as const, label: 'Offline' };
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: editingDevice.active ? 'var(--brand-subtle)' : 'var(--surface-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: editingDevice.active ? 'var(--text-brand)' : 'var(--text-faint)',
                }}>
                  <TabletIcon size={24} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 16, color: 'var(--text-strong)' }}>
                    {editingDevice.name || 'Tablet bez nazwy'}
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <StatusBadge tone={editBadge.tone}>{editBadge.label}</StatusBadge>
                  </div>
                </div>
              </div>

              <Field label="Nazwa urządzenia">
                <input
                  type="text" style={inputStyle}
                  value={editingDevice.name}
                  onChange={e => setEditingDevice({ ...editingDevice, name: e.target.value })}
                  placeholder="np. Tablet Rejestracja"
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--focus-ring)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                />
              </Field>

              <Field label="Przypisana lokalizacja">
                <select
                  style={inputStyle}
                  value={editingDevice.locationId}
                  onChange={e => setEditingDevice({ ...editingDevice, locationId: e.target.value })}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--focus-ring)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                >
                  <option value="">Nieprzypisany do żadnej lokalizacji</option>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </Field>
            </div>
          );
        })()}
      </SlidePanel>
    </div>
  );
}
