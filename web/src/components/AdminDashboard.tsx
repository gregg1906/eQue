import { useState } from 'react';

interface Device {
  id: string;
  name: string;
  locationId: string;
}

interface Location {
  id: string;
  name: string;
}

const btnPrimary: React.CSSProperties = {
  background: 'var(--brand)',
  color: 'var(--on-brand)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  padding: '9px 18px',
  fontFamily: 'var(--font-ui)',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--text-body)',
  border: '1.5px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '9px 18px',
  fontFamily: 'var(--font-ui)',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  background: '#FEF2F2',
  color: '#CE363B',
  border: '1.5px solid #FEE2E2',
  borderRadius: 'var(--radius-md)',
  padding: '9px 18px',
  fontFamily: 'var(--font-ui)',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  fontFamily: 'var(--font-ui)',
  fontSize: 14.5,
  color: 'var(--text-strong)',
  background: 'var(--surface-card)',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontFamily: 'var(--font-ui)',
  fontSize: 13.5,
  fontWeight: 600,
  color: 'var(--text-body)',
};

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
    if (saved) return JSON.parse(saved);
    return [
      { id: 'dev1', name: 'Tablet Wejściowy', locationId: 'loc1' },
      { id: 'dev2', name: 'Tablet Rejestracja', locationId: 'loc2' },
      { id: 'dev3', name: 'Kiosk Kardiologia', locationId: 'loc3' },
    ];
  });

  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const handleSimulateScan = () => {
    const newDevice: Device = { id: Date.now().toString(), name: '', locationId: '' };
    const updated = [...devices, newDevice];
    setDevices(updated);
    localStorage.setItem('eque_devices', JSON.stringify(updated));
    onAddClose?.();
  };

  const handleSaveEdit = () => {
    if (!editingDevice) return;
    const updated = devices.map(d => d.id === editingDevice.id ? editingDevice : d);
    setDevices(updated);
    localStorage.setItem('eque_devices', JSON.stringify(updated));
    setEditingDevice(null);
  };

  const handleDeleteDevice = () => {
    if (!editingDevice) return;
    if (!window.confirm(`Czy na pewno chcesz usunąć tablet "${editingDevice.name || 'bez nazwy'}"?`)) return;
    const updated = devices.filter(d => d.id !== editingDevice.id);
    setDevices(updated);
    localStorage.setItem('eque_devices', JSON.stringify(updated));
    setEditingDevice(null);
  };

  const getLocationName = (locId: string) => locations.find(l => l.id === locId)?.name ?? '';

  if (editingDevice) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button
          onClick={() => setEditingDevice(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 13.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 20 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7"/>
          </svg>
          Wróć do listy tabletów
        </button>

        <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--text-strong)', marginBottom: 24 }}>Edycja tabletu</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Nazwa urządzenia</label>
              <input
                type="text"
                value={editingDevice.name}
                onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
                placeholder="np. Tablet Rejestracja"
                style={inputStyle}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--focus-ring)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Przypisana lokalizacja</label>
              <select
                value={editingDevice.locationId}
                onChange={(e) => setEditingDevice({ ...editingDevice, locationId: e.target.value })}
                style={{ ...inputStyle }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--focus-ring)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
              >
                <option value="">Nieprzypisany do żadnej lokacji</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button style={btnDanger} onClick={handleDeleteDevice}>Usuń tablet</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btnSecondary} onClick={() => setEditingDevice(null)}>Anuluj</button>
              <button
                style={btnPrimary}
                onClick={handleSaveEdit}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand)'; }}
              >
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>

      <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {devices.map((device) => {
            const nameMissing = !device.name;
            const locMissing = !device.locationId;
            return (
              <li key={device.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setEditingDevice(device)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--brand-subtle)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  <div>
                    <p style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 14.5, color: nameMissing ? '#CE363B' : 'var(--text-strong)', margin: '0 0 2px' }}>
                      {nameMissing ? 'Nazwa nie została ustawiona' : device.name}
                    </p>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: locMissing ? '#CE363B' : 'var(--text-muted)', margin: 0 }}>
                      Lokalizacja: {locMissing ? 'Nieprzypisany' : getLocationName(device.locationId)}
                    </p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </li>
            );
          })}
          {devices.length === 0 && (
            <li style={{ padding: 24, textAlign: 'center', fontFamily: 'var(--font-ui)', color: 'var(--text-muted)' }}>Brak dodanych urządzeń.</li>
          )}
        </ul>
      </div>

      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(12,16,19,0.55)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 360, background: 'var(--surface-card)', borderRadius: 'var(--radius-xl)', padding: 28, boxShadow: '0 18px 48px rgba(21,27,31,0.16)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-strong)', textAlign: 'center', marginBottom: 6 }}>Skonfiguruj nowe urządzenie</h3>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13.5, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>
              Uruchom aplikację eQue na nowym tablecie i zeskanuj poniższy kod QR.
            </p>
            <div style={{ margin: '0 auto 28px', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border-default)', background: 'var(--surface-sunken)' }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1">
                <path d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm12 0h6v6h-6v-6z"/>
              </svg>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{ ...btnSecondary, flex: 1 }}
                onClick={onAddClose}
              >
                Wstecz
              </button>
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
    </div>
  );
}
