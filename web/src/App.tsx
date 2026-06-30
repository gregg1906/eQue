import { useState } from 'react';
import LoginForm from './components/LoginForm';
import AdminHome from './components/AdminHome';
import AdminDashboard from './components/AdminDashboard';
import AdminLocations from './components/AdminLocations';
import AdminUsers from './components/AdminUsers';
import Sidebar from './components/Sidebar';
import UserSidebar from './components/UserSidebar';
import UserQueue from './components/UserQueue';

type Role = 'admin' | 'user' | null;

const TAB_META: Record<string, { title: string; action: string | null }> = {
  strona_glowna: { title: 'Pulpit',      action: null },
  tablety:       { title: 'Tablety',     action: 'Dodaj urządzenie' },
  lokalizacje:   { title: 'Lokalizacje', action: 'Dodaj lokalizację' },
  uzytkownicy:   { title: 'Użytkownicy', action: 'Dodaj użytkownika' },
  kolejka:       { title: 'Kolejka',     action: null },
};


export default function App() {
  const [role, setRole] = useState<Role>(() => {
    return (localStorage.getItem('eque_role') as Role) || null;
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('eque_userName') || '';
  });

  const [activeTab, setActiveTab] = useState<string>('strona_glowna');
  const [addOpen, setAddOpen] = useState(false);

  const handleLoginSuccess = (loggedRole: 'admin' | 'user', loggedName: string) => {
    setRole(loggedRole);
    setUserName(loggedName);
    setActiveTab('strona_glowna');
    localStorage.setItem('eque_role', loggedRole);
    localStorage.setItem('eque_userName', loggedName);
  };

  const handleLogout = () => {
    setRole(null);
    setUserName('');
    localStorage.removeItem('eque_role');
    localStorage.removeItem('eque_userName');
    localStorage.removeItem('eque_token');
  };

  if (!role) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const meta = TAB_META[activeTab] ?? { title: activeTab, action: null };

  const placeholder = (text: string) => (
    <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }}>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 16, margin: 0 }}>{text}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-page)' }}>
      {role === 'admin' && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={tab => { setActiveTab(tab); setAddOpen(false); }}
          userName={userName}
          userRole="admin"
          onLogout={handleLogout}
        />
      )}
      {role === 'user' && (
        <UserSidebar
          activeTab={activeTab}
          setActiveTab={tab => { setActiveTab(tab); setAddOpen(false); }}
          userName={userName}
          onLogout={handleLogout}
        />
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Sticky page header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '22px 48px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30,
            color: 'var(--text-strong)', margin: 0, letterSpacing: '-0.02em',
          }}>
            {meta.title}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {meta.action && (
              <button
                onClick={() => setAddOpen(true)}
                style={{
                  background: 'var(--brand)', color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-md)', padding: '10px 20px',
                  fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 15,
                  cursor: 'pointer', transition: 'background var(--dur-fast)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; }}
              >
                + {meta.action}
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>
            {role === 'admin' ? (
              activeTab === 'strona_glowna' ? <AdminHome userName={userName} />
              : activeTab === 'tablety'     ? <AdminDashboard addOpen={addOpen} onAddClose={() => setAddOpen(false)} />
              : activeTab === 'lokalizacje' ? <AdminLocations addOpen={addOpen} onAddClose={() => setAddOpen(false)} />
              : activeTab === 'uzytkownicy' ? <AdminUsers addOpen={addOpen} onAddClose={() => setAddOpen(false)} />
              : placeholder('Pusta zakładka')
            ) : role === 'user' ? (
              activeTab === 'kolejka' ? <UserQueue userName={userName} />
              : placeholder('Strona główna (w przygotowaniu)')
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
