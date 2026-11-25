import { useEffect, useRef } from 'react';
import Icon, { type IconName } from './Icon';
import QueueLetter from './QueueLetter';
import LiveIndicator from './LiveIndicator';
import { useSessionRemaining } from '../../lib/session';
import { useFocusTrap } from '../../lib/useFocusTrap';

export interface NavItem {
  key: string;
  label: string;
  icon?: IconName;
  /** Litera kolejki zamiast ikony. */
  letter?: string;
  /** Pełna etykieta dla czytnika ekranu (np. z liczbą czekających). */
  ariaLabel?: string;
  /** Licznik po prawej, np. liczba czekających. */
  count?: number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/**
  Wspólne menu boczne administratora i operatora. Poniżej 860 px chowa się
  i wysuwa jako panel po kliknięciu przycisku menu w nagłówku.
*/
function useMobileNavFocus(open: boolean, onClose: () => void) {
  const asideRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raf = requestAnimationFrame(() => {
      asideRef.current?.querySelector<HTMLElement>('[aria-current="page"], .sidenav-item')?.focus();
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, [open]);

  useFocusTrap(asideRef, open);
  return asideRef;
}

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function SessionTimer() {
  const left = useSessionRemaining();
  if (left === null) return null;
  return (
    <span className="session-timer" title="Czas do automatycznego wylogowania (odnawia się przy aktywności)">
      Wylogowanie za <b>{formatRemaining(left)}</b>
    </span>
  );
}

export default function SideNav({ groups, activeTab, onSelect, userName, onLogout, onRefresh, open, onClose, label }: {
  groups: NavGroup[];
  activeTab: string;
  onSelect: (key: string) => void;
  userName: string;
  onLogout: () => void;
  onRefresh?: () => Promise<void> | void;
  /** Stan panelu na wąskim ekranie. */
  open: boolean;
  onClose: () => void;
  label: string;
}) {
  const asideRef = useMobileNavFocus(open, onClose);

  return (
    <>
      <div className={open ? 'sidenav-scrim is-open' : 'sidenav-scrim'} onClick={onClose} aria-hidden="true" />
      <aside
        ref={asideRef}
        id="app-sidenav"
        className={open ? 'sidenav is-open' : 'sidenav'}
        aria-label={label}
      >
        <div className="sidenav-brand">
          <img src="/logo-mark.svg" width="28" height="28" alt="" />
          <span>eQue</span>
        </div>

        <nav className="sidenav-nav">
          {groups.map((group, gi) => (
            <div key={group.label ?? gi} className="sidenav-group">
              {group.label && <span className="sidenav-group-label">{group.label}</span>}
              {group.items.map(item => {
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className="sidenav-item"
                    aria-current={active ? 'page' : undefined}
                    aria-label={item.ariaLabel}
                    onClick={() => onSelect(item.key)}
                  >
                    {item.letter ? <QueueLetter letter={item.letter} size="sm" /> : item.icon && <Icon name={item.icon} />}
                    <span className="sidenav-item-label" title={item.label}>{item.label}</span>
                    {item.count !== undefined && <span className="sidenav-count">{item.count}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidenav-foot">
          <div className="sidenav-status">
            <LiveIndicator onRefresh={onRefresh} />
            <SessionTimer />
          </div>

          <div className="sidenav-user">
            <div className="sidenav-who">
              <b title={userName}>{userName}</b>
            </div>
            <button type="button" className="icon-btn" onClick={onLogout} aria-label="Wyloguj" title="Wyloguj">
              <Icon name="out" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
