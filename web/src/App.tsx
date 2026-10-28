import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import LoginForm from './components/LoginForm';
import AdminHome, { type NavigateOptions } from './components/AdminHome';
import AdminDashboard from './components/AdminDashboard';
import AdminLocations from './components/AdminLocations';
import AdminUsers from './components/AdminUsers';
import AdminSettings from './components/AdminSettings';
import Sidebar from './components/Sidebar';
import UserSidebar from './components/UserSidebar';
import UserHome from './components/UserHome';
import UserQueue from './components/UserQueue';
import Button from './components/ui/Button';
import Icon from './components/ui/Icon';
import Kbd from './components/ui/Kbd';
import LiveIndicator from './components/ui/LiveIndicator';
import CommandPalette, { type CommandItem } from './components/ui/CommandPalette';
import EmptyState from './components/ui/EmptyState';
import { ToastHost } from './components/ui/Toast';
import { api, getToken, clearToken } from './lib/api';
import { ws } from './lib/ws';
import { DialogHost } from './lib/dialogs';
import { runQueueCommand } from './lib/commands';
import { sortByName } from './lib/sort';
import { readThemePreference, saveThemePreference, systemPrefersDark, type ThemePreference } from './lib/theme';
import { useWaitingTotal } from './lib/useWaitingTotal';
import type { LocationResponse, MeResponse, RefreshHandle } from './lib/apiTypes';

type Role = 'admin' | 'user' | null;

interface Session {
  id: string;
  role: Role;
  fullName: string;
  locationIds: number[];
}

/** Przejście z innego ekranu: otwórz panel edycji (admin) albo wybierz lokalizację w kolejce (operator). */
interface Intent {
  tab: string;
  id: number;
}

function meToSession(me: MeResponse): Session {
  return {
    id: me.id,
    role: me.role === 'ADMIN' ? 'admin' : 'user',
    fullName: me.full_name,
    locationIds: me.location_ids,
  };
}

function homeTab(role: Role) {
  return role === 'admin' ? 'strona_glowna' : 'kolejka';
}

const TAB_META: Record<string, { title: string; action: string | null }> = {
  strona_glowna: { title: 'Pulpit',          action: null },
  lokalizacje:   { title: 'Lokalizacje',     action: 'Dodaj lokalizację' },
  tablety:       { title: 'Tablety',         action: 'Dodaj tablet' },
  uzytkownicy:   { title: 'Użytkownicy',     action: 'Dodaj użytkownika' },
  ustawienia:    { title: 'Ustawienia',      action: null },
  kolejka:       { title: 'Kolejka na żywo', action: null },
};

const ADMIN_TABS = ['strona_glowna', 'lokalizacje', 'tablety', 'uzytkownicy', 'ustawienia'];
const USER_TABS = ['kolejka', 'strona_glowna', 'ustawienia'];
const NO_LOCATIONS: number[] = [];

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [activeTab, setActiveTab] = useState<string>('strona_glowna');
  const [addOpen, setAddOpen] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteLocations, setPaletteLocations] = useState<LocationResponse[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const contentRef = useRef<RefreshHandle | null>(null);

  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    saveThemePreference(theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    const id = setTimeout(() => {
      const token = getToken();
      if (!token) {
        setCheckingSession(false);
        return;
      }
      api.get<MeResponse>('/auth/me')
        .then(me => {
          const s = meToSession(me);
          setSession(s);
          setActiveTab(homeTab(s.role));
        })
        .catch(() => clearToken())
        .finally(() => setCheckingSession(false));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!session) return;
    const topics = session.role === 'admin' ? ['admin'] : session.locationIds.map(id => `location:${id}`);
    ws.connect(topics);
    const offReconnect = ws.onReconnect(() => { contentRef.current?.refetch(); });
    return () => { offReconnect(); ws.disconnect(); };
  }, [session]);

  // Ctrl/Cmd+K — paleta poleceń na każdym ekranie
  useEffect(() => {
    if (!session) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        if (document.querySelector('[role="alertdialog"]')) return;
        e.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [session]);

  useEffect(() => {
    if (!paletteOpen || !session) return;
    let cancelled = false;
    api.get<LocationResponse[]>('/admin/locations')
      .then(locs => { if (!cancelled) setPaletteLocations(locs); })
      .catch(() => { /* paleta działa bez listy lokalizacji */ });
    return () => { cancelled = true; };
  }, [paletteOpen, session]);

  const waitingCount = useWaitingTotal(session?.locationIds ?? NO_LOCATIONS, session?.role === 'user');

  const clearIntent = useCallback(() => setIntent(null), []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const openAdd = useCallback(() => setAddOpen(true), []);

  const switchTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setAddOpen(false);
    setIntent(null);
    setNavOpen(false);
  }, []);

  const navigate = useCallback((tab: string, opts?: NavigateOptions) => {
    setActiveTab(tab);
    setNavOpen(false);
    setAddOpen(!!opts?.add);
    setIntent(opts?.editId !== undefined ? { tab, id: opts.editId } : null);
  }, []);

  const openQueue = (locationId?: number) => {
    if (activeTab === 'kolejka') {
      if (locationId !== undefined) runQueueCommand({ type: 'select', locationId });
      return;
    }
    setActiveTab('kolejka');
    setNavOpen(false);
    setIntent(locationId !== undefined ? { tab: 'kolejka', id: locationId } : null);
  };

  const handleLoginSuccess = (me: MeResponse) => {
    const s = meToSession(me);
    setSession(s);
    setActiveTab(homeTab(s.role));
  };

  const handleLogout = () => {
    setSession(null);
    setPaletteOpen(false);
    setNavOpen(false);
    setAddOpen(false);
    setIntent(null);
    clearToken();
  };

  const hosts = <><DialogHost /><ToastHost /></>;

  if (checkingSession) {
    return <div className="app-loading" role="status" aria-label="Wczytywanie"><div className="spinner" /></div>;
  }

  if (!session) {
    return <><LoginForm onLoginSuccess={handleLoginSuccess} />{hosts}</>;
  }

  const { id: currentUserId, role, fullName: userName, locationIds } = session;
  const meta = TAB_META[activeTab] ?? { title: activeTab, action: null };
  const intentId = (tab: string) => (intent?.tab === tab ? intent.id : null);

  const paletteItems: CommandItem[] = [
    ...(role === 'admin' ? ADMIN_TABS : USER_TABS).map(tab => ({
      id: `tab-${tab}`, label: TAB_META[tab].title, group: 'Ekran', run: () => switchTab(tab),
    })),
    ...(role === 'user' && activeTab === 'kolejka' ? [
      { id: 'q-primary', label: 'Obsłużono, wezwij następną osobę', group: 'Akcja', run: () => runQueueCommand({ type: 'primary' }) },
      { id: 'q-noshow', label: 'Nie zgłosił się', group: 'Akcja', run: () => runQueueCommand({ type: 'noshow' }) },
      { id: 'q-pause', label: 'Wstrzymaj lub wznów zapisy', group: 'Akcja', run: () => runQueueCommand({ type: 'togglePause' }) },
    ] : []),
    ...(role === 'admin' ? [
      { id: 'add-location', label: 'Dodaj lokalizację', group: 'Akcja', run: () => navigate('lokalizacje', { add: true }) },
      { id: 'add-tablet', label: 'Dodaj tablet', group: 'Akcja', run: () => navigate('tablety', { add: true }) },
      { id: 'add-user', label: 'Dodaj użytkownika', group: 'Akcja', run: () => navigate('uzytkownicy', { add: true }) },
    ] : []),
    ...sortByName(
      role === 'admin' ? paletteLocations : paletteLocations.filter(l => l.is_active && locationIds.includes(l.id)),
      l => l.name,
    ).map(l => role === 'admin'
      ? { id: `loc-${l.id}`, label: `Edytuj: ${l.name}`, group: 'Lokalizacja', run: () => navigate('lokalizacje', { editId: l.id }) }
      : { id: `loc-${l.id}`, label: `${l.queue_code} · ${l.name}`, group: 'Lokalizacja', run: () => openQueue(l.id) }),
    { id: 'theme-light', label: 'Motyw jasny', group: 'Ustawienia', run: () => setTheme('light') },
    { id: 'theme-dark', label: 'Motyw ciemny', group: 'Ustawienia', run: () => setTheme('dark') },
    { id: 'theme-system', label: 'Motyw systemowy', group: 'Ustawienia', run: () => setTheme('system') },
    { id: 'logout', label: 'Wyloguj', group: 'Konto', run: handleLogout },
  ];

  let content: React.ReactNode;
  if (role === 'admin') {
    content =
      activeTab === 'strona_glowna' ? <AdminHome ref={contentRef} onNavigate={navigate} />
      : activeTab === 'tablety'     ? <AdminDashboard ref={contentRef} addOpen={addOpen} onAddOpen={openAdd} onAddClose={closeAdd} editId={intentId('tablety')} onEditHandled={clearIntent} />
      : activeTab === 'lokalizacje' ? <AdminLocations ref={contentRef} addOpen={addOpen} onAddOpen={openAdd} onAddClose={closeAdd} editId={intentId('lokalizacje')} onEditHandled={clearIntent} />
      : activeTab === 'uzytkownicy' ? <AdminUsers ref={contentRef} addOpen={addOpen} onAddOpen={openAdd} onAddClose={closeAdd} currentUserId={currentUserId} />
      : activeTab === 'ustawienia'  ? <AdminSettings theme={theme} onThemeChange={setTheme} />
      : null;
  } else {
    content =
      activeTab === 'strona_glowna' ? <UserHome ref={contentRef} locationIds={locationIds} onOpenQueue={openQueue} />
      : activeTab === 'kolejka'     ? <UserQueue ref={contentRef} locationIds={locationIds} initialLocationId={intentId('kolejka')} />
      : activeTab === 'ustawienia'  ? <AdminSettings theme={theme} onThemeChange={setTheme} />
      : null;
  }

  return (
    <div className="app-shell">
      {role === 'admin' ? (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={switchTab}
          userName={userName}
          onLogout={handleLogout}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />
      ) : (
        <UserSidebar
          activeTab={activeTab}
          setActiveTab={switchTab}
          userName={userName}
          onLogout={handleLogout}
          waitingCount={waitingCount}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />
      )}

      <main className="app-main">
        <header className="app-head">
          <button
            type="button"
            className="icon-btn nav-toggle"
            aria-label="Otwórz menu"
            aria-expanded={navOpen}
            aria-controls="app-sidenav"
            onClick={() => setNavOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <h1 className="app-title">{meta.title}</h1>
          <div className="app-head-actions">
            {activeTab !== 'ustawienia' && <LiveIndicator onRefresh={() => contentRef.current?.refetch()} />}
            {meta.action && <Button variant="primary" icon="plus" onClick={openAdd}>{meta.action}</Button>}
            <button
              type="button"
              className="cmdk-btn"
              onClick={() => setPaletteOpen(true)}
              aria-label="Szukaj i przejdź"
              aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
            >
              <Icon name="search" />
              <span className="cmdk-btn-label">Szukaj</span>
              <Kbd keys={[MOD_KEY, 'K']} />
            </button>
          </div>
        </header>

        <div className="app-body">
          <div className="app-body-in">
            {content ?? <div className="card"><EmptyState title="Pusta zakładka" text="Wybierz ekran z menu po lewej." /></div>}
          </div>
        </div>
      </main>

      {paletteOpen && <CommandPalette items={paletteItems} onClose={() => setPaletteOpen(false)} />}
      {hosts}
    </div>
  );
}
