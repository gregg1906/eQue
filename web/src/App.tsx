import { useState } from 'react';
import LoginForm from './components/LoginForm';
import AdminDashboard from './components/AdminDashboard';
import AdminLocations from './components/AdminLocations';
import AdminUsers from './components/AdminUsers';
import Sidebar from './components/Sidebar';
import UserSidebar from './components/UserSidebar';
import UserQueue from './components/UserQueue';

type Role = 'admin' | 'user' | null;

export default function App() {
  const [role, setRole] = useState<Role>(() => {
    return (localStorage.getItem('eque_role') as Role) || null;
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('eque_userName') || '';
  });

  const [activeTab, setActiveTab] = useState<string>('strona_glowna');

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

  const initials = userName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', background: 'var(--surface-page)' }}>
      <nav style={{
        display: 'flex', height: 56, flexShrink: 0, alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--surface-card)',
        padding: '0 24px',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-mark.svg" width="28" height="28" alt="" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, letterSpacing: '-0.01em', color: 'var(--text-strong)' }}>
            eQue
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--brand-subtle-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12,
              color: 'var(--text-brand)', flexShrink: 0,
            }}>
              {initials}
            </div>
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 14, color: 'var(--text-body)' }}>
              {userName}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Wyloguj"
            style={{
              border: '1.5px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'background var(--dur-fast), color var(--dur-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-sunken)';
              e.currentTarget.style.color = 'var(--text-body)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {role === 'admin' && (
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
        {role === 'user' && (
          <UserSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        <main style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
            {role === 'admin' ? (
              activeTab === 'strona_glowna' ? (
                <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Strona główna (w przygotowaniu)</p>
                </div>
              ) : activeTab === 'tablety' ? (
                <AdminDashboard />
              ) : activeTab === 'lokalizacje' ? (
                <AdminLocations />
              ) : activeTab === 'uzytkownicy' ? (
                <AdminUsers />
              ) : (
                <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Pusta zakładka</p>
                </div>
              )
            ) : role === 'user' ? (
              activeTab === 'kolejka' ? (
                <UserQueue userName={userName} />
              ) : (
                <div style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }}>
                  <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Strona główna (w przygotowaniu)</p>
                </div>
              )
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
