import { IS_MAC, MOD_KEY } from './lib/platform';
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
import Icon from './components/ui/Icon';
import Kbd from './components/ui/Kbd';
import CommandPalette, { type CommandItem } from './components/ui/CommandPalette';
import EmptyState from './components/ui/EmptyState';
import { ToastHost } from './components/ui/Toast';
import { api, getToken, clearToken, setUnauthorizedHandler, ApiError } from './lib/api';
import { ws } from './lib/ws';
import { DialogHost } from './lib/dialogs';
import { startSessionKeeper } from './lib/session';
import { runQueueCommand } from './lib/commands';
import { sortByName } from './lib/sort';
import { SYSTEM_DARK, SYSTEM_MORE_CONTRAST, useMediaQuery, type ThemePreference } from './lib/theme';
import { applyPreferencesToDocument, loadPreferences, resetPreferences, updatePreferences, usePreferences } from './lib/preferences';
import { useNewTicketSound } from './lib/sound';
import { showToast, dismissToast } from './components/ui/useToast';
import { useQueueSummaries } from './lib/useQueueSummaries';
import { pathForTab, tabFromPath } from './lib/routes';
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

function homeTab() {
  return 'strona_glowna';
}

const TAB_META: Record<string, { title: string; action: string | null }> = {
  strona_glowna: { title: 'Pulpit',          action: null },
  lokalizacje:   { title: 'Lokalizacje',     action: 'Dodaj lokalizację' },
  tablety:       { title: 'Tablety',         action: 'Dodaj tablet' },
  uzytkownicy:   { title: 'Użytkownicy',     action: 'Dodaj użytkownika' },
  ustawienia:    { title: 'Ustawienia',      action: null },
};

const ADMIN_TABS = ['strona_glowna', 'lokalizacje', 'tablety', 'uzytkownicy', 'ustawienia'];
const USER_TABS = ['strona_glowna', 'ustawienia'];

/** Zakładka kolejki operatora: „kolejka:<id lokalizacji>”. */
const queueTab = (locationId: number) => `kolejka:${locationId}`;
function queueIdFromTab(tab: string): number | null {
  const m = /^kolejka:(\d+)$/.exec(tab);
  return m ? Number(m[1]) : null;
}
const NO_LOCATIONS: number[] = [];

/** Kolejka, której już nie ma wśród aktywnych lokalizacji operatora (np. dezaktywowana), → Pulpit. */
function resolveTab(selected: string, role: Role, queues: { id: number }[] | undefined): string {
  const id = queueIdFromTab(selected);
  const gone = id !== null && (role !== 'user' || (queues !== undefined && !queues.some(q => q.id === id)));
  return gone ? homeTab() : selected;
}

const allowedTabs = (role: Role) => (role === 'admin' ? ADMIN_TABS : USER_TABS);

const SESSION_EXPIRED = 'Twoja sesja wygasła. Zaloguj się ponownie, żeby kontynuować pracę.';


export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  /** Komunikat na ekranie logowania, np. o wygaśnięciu sesji. */
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  const [selectedTab, setActiveTab] = useState<string>('strona_glowna');
  const [addOpen, setAddOpen] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteLocations, setPaletteLocations] = useState<LocationResponse[]>([]);
  const [navOpen, setNavOpen] = useState(false);
  const contentRef = useRef<RefreshHandle | null>(null);
  /** Po przejściu zrobionym przez użytkownika (menu, paleta, wstecz) fokus trafia na nagłówek ekranu. */
  const focusTitleRef = useRef(false);

  // Ustawienia z konta (motyw, rozmiar tekstu, kontrast, ruch…) — patrz lib/preferences.ts
  const prefs = usePreferences();
  // ustawienia systemu: motyw „Systemowy” i ekran logowania; kontrast z systemu działa zawsze
  const systemDark = useMediaQuery(SYSTEM_DARK);
  const systemMoreContrast = useMediaQuery(SYSTEM_MORE_CONTRAST);

  useLayoutEffect(() => {
    applyPreferencesToDocument(prefs, { dark: systemDark, moreContrast: systemMoreContrast });
  }, [prefs, systemDark, systemMoreContrast]);

  const setTheme = useCallback((theme: ThemePreference) => {
    updatePreferences({ theme }).catch(() => {
      showToast('Nie udało się zapisać motywu na koncie. Sprawdź połączenie i spróbuj ponownie.', { tone: 'error' });
    });
  }, []);

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
          setActiveTab(tabFromPath(window.location.pathname, allowedTabs(s.role)));
        })
        .catch(err => {
          clearToken();
          resetPreferences();
          if (err instanceof ApiError && err.status === 401) setLoginNotice(SESSION_EXPIRED);
        })
        .finally(() => setCheckingSession(false));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  /** Kończy sesję: zamyka panele, czyści token i (opcjonalnie) zostawia komunikat na ekranie logowania. */
  const endSession = useCallback((notice: string | null) => {
    // Wylogowanie z serwera (Z3): unieważnia token, a nie tylko usuwa go z przeglądarki.
    // Przy wygasłej sesji (notice) token i tak jest już odrzucony, więc wołamy tylko przy świadomym wylogowaniu.
    if (notice === null && getToken()) void api.post('/auth/logout').catch(() => {});
    // świadome wylogowanie zaczyna od „/”; po wygaśnięciu sesji adres zostaje, więc po zalogowaniu wracasz na ten sam ekran
    if (notice === null) window.history.replaceState(null, '', '/');
    setSession(null);
    dismissToast(); // błędy nie znikają same, więc stary nie może zostać na ekranie logowania
    setPaletteOpen(false);
    setNavOpen(false);
    setAddOpen(false);
    setIntent(null);
    clearToken();
    // ekran logowania wraca do ustawień systemu, a nie ustawień osoby, która właśnie skończyła
    resetPreferences();
    setLoginNotice(notice);
  }, []);

  // Wygasła lub odrzucona sesja (REST 401, WS 4001/4003, upływ czasu) → ekran logowania z wyjaśnieniem.
  useEffect(() => {
    if (!session) return;
    const expire = () => endSession(SESSION_EXPIRED);
    setUnauthorizedHandler(expire);
    const offWsAuth = ws.onAuthFailure(expire);
    const stopKeeper = startSessionKeeper({ onExpired: expire, onLogout: () => endSession(null) });
    // ustawienia z konta — kopia lokalna wystarczy do pierwszego malowania, serwer jest źródłem prawdy
    loadPreferences().catch(() => { /* zostają ostatnio znane ustawienia */ });
    return () => { setUnauthorizedHandler(null); offWsAuth(); stopKeeper(); };
  }, [session, endSession]);

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

  const queues = useQueueSummaries(session?.locationIds ?? NO_LOCATIONS, session?.role === 'user');
  useNewTicketSound(session?.locationIds ?? NO_LOCATIONS, session?.role === 'user');

  const clearIntent = useCallback(() => setIntent(null), []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const openAdd = useCallback(() => setAddOpen(true), []);

  /** Zmienia ekran i dopisuje wpis do historii przeglądarki (przycisk „wstecz” działa jak w zwykłej stronie). */
  const go = useCallback((tab: string) => {
    const path = pathForTab(tab);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
      focusTitleRef.current = true;
    }
    setActiveTab(tab);
  }, []);

  const switchTab = useCallback((tab: string) => {
    go(tab);
    setAddOpen(false);
    setIntent(null);
    setNavOpen(false);
  }, [go]);

  const navigate = useCallback((tab: string, opts?: NavigateOptions) => {
    go(tab);
    setNavOpen(false);
    setAddOpen(!!opts?.add);
    setIntent(opts?.editId !== undefined ? { tab, id: opts.editId } : null);
  }, [go]);

  const defaultQueueId = prefs.default_location_id;
  const openQueue = (locationId?: number) => {
    const id = locationId
      ?? (defaultQueueId !== null && queues?.some(q => q.id === defaultQueueId) ? defaultQueueId : queues?.[0]?.id);
    if (id === undefined) return;
    switchTab(queueTab(id));
  };

  const handleLoginSuccess = (me: MeResponse) => {
    const s = meToSession(me);
    setLoginNotice(null);
    setSession(s);
    setActiveTab(tabFromPath(window.location.pathname, allowedTabs(s.role)));
  };

  const handleLogout = () => endSession(null);

  // Przycisk „wstecz” i „dalej”
  useEffect(() => {
    if (!session) return;
    const onPop = () => {
      focusTitleRef.current = true;
      setActiveTab(tabFromPath(window.location.pathname, allowedTabs(session.role)));
      setAddOpen(false);
      setIntent(null);
      setNavOpen(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [session]);

  // Adres, tytuł karty i fokus zawsze zgodne z ekranem, który naprawdę widać (po ewentualnym powrocie na Pulpit)
  const role = session?.role ?? null;
  const resolvedTab = role ? resolveTab(selectedTab, role, queues) : null;
  const resolvedQueue = resolvedTab ? queues?.find(q => q.id === queueIdFromTab(resolvedTab)) : undefined;
  const waitingNow = resolvedQueue?.waiting ?? 0;
  const queueName = resolvedQueue?.name;

  useEffect(() => {
    if (resolvedTab && window.location.pathname !== pathForTab(resolvedTab)) {
      window.history.replaceState(null, '', pathForTab(resolvedTab));
    }
  }, [resolvedTab]);

  useEffect(() => {
    if (checkingSession) return;
    if (!resolvedTab) { document.title = 'Logowanie · eQue'; return; }
    const count = waitingNow > 0 ? `(${waitingNow}) ` : '';
    const name = queueIdFromTab(resolvedTab) !== null ? `Kolejka: ${queueName ?? ''}`.replace(/: $/, '') : TAB_META[resolvedTab]?.title;
    document.title = `${count}${name ?? 'Panel'} · eQue`;
  }, [checkingSession, resolvedTab, waitingNow, queueName]);

  useEffect(() => {
    if (!focusTitleRef.current || !resolvedTab) return;
    focusTitleRef.current = false;
    document.getElementById('app-title')?.focus();
  }, [resolvedTab]);

  const hosts = <><DialogHost /><ToastHost /></>;

  if (checkingSession) {
    return <div className="app-loading" role="status" aria-label="Wczytywanie"><div className="spinner" /></div>;
  }

  if (!session) {
    return <><LoginForm onLoginSuccess={handleLoginSuccess} notice={loginNotice} />{hosts}</>;
  }

  const { id: currentUserId, fullName: userName, locationIds } = session;
  const activeTab = resolveTab(selectedTab, session.role, queues);
  const openQueueId = queueIdFromTab(activeTab);
  const activeQueue = openQueueId !== null ? queues?.find(q => q.id === openQueueId) : undefined;
  const meta = TAB_META[activeTab] ?? { title: activeQueue?.name ?? 'Kolejka', action: null };
  const intentId = (tab: string) => (intent?.tab === tab ? intent.id : null);

  const paletteItems: CommandItem[] = [
    ...(role === 'admin' ? ADMIN_TABS : USER_TABS).map(tab => ({
      id: `tab-${tab}`, label: TAB_META[tab].title, group: 'Ekran', run: () => switchTab(tab),
    })),
    ...(role === 'user' && activeQueue ? [
      { id: 'q-primary', label: 'Obsłużono, wezwij następną osobę', group: 'Akcja', run: () => runQueueCommand({ type: 'primary' }) },
      { id: 'q-noshow', label: 'Nie zgłosił się', group: 'Akcja', run: () => runQueueCommand({ type: 'noshow' }) },
      { id: 'q-recall', label: 'Wezwij ponownie', group: 'Akcja', run: () => runQueueCommand({ type: 'recall' }) },
      { id: 'q-add', label: 'Dodaj osobę do kolejki', group: 'Akcja', run: () => runQueueCommand({ type: 'addPerson' }) },
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
      : activeTab === 'ustawienia'  ? <AdminSettings isOperator={false} />
      : null;
  } else {
    content =
      activeTab === 'strona_glowna' ? <UserHome ref={contentRef} locationIds={locationIds} currentUserId={currentUserId} onOpenQueue={openQueue} />
      : activeQueue                 ? <UserQueue ref={contentRef} locationIds={locationIds} currentUserId={currentUserId} locationId={activeQueue.id} />
      : activeTab === 'ustawienia'  ? <AdminSettings isOperator />
      : null;
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#tresc" onClick={e => { e.preventDefault(); document.getElementById('tresc')?.focus(); }}>Przejdź do treści</a>
      {role === 'admin' ? (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={switchTab}
          userName={userName}
          onLogout={handleLogout}
          onRefresh={() => contentRef.current?.refetch()}
          open={navOpen}
          onClose={() => setNavOpen(false)}
        />
      ) : (
        <UserSidebar
          activeTab={activeTab}
          setActiveTab={switchTab}
          userName={userName}
          onLogout={handleLogout}
          onRefresh={() => contentRef.current?.refetch()}
          queues={queues}
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
          <h1 className="app-title" id="app-title" tabIndex={-1}>{meta.title}</h1>
          <div className="app-head-actions">
            <button
              type="button"
              className="cmdk-btn"
              onClick={() => setPaletteOpen(true)}
              aria-label="Szukaj ekranów i akcji"
              aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
            >
              <Icon name="search" />
              <span className="cmdk-btn-label">Szukaj</span>
              <Kbd keys={[MOD_KEY, 'K']} />
            </button>
          </div>
        </header>

        <div className="app-body" id="tresc" tabIndex={-1}>
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
