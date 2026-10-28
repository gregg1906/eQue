import { useEffect, useRef } from 'react';
import Avatar from './Avatar';
import Icon, { type IconName } from './Icon';

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
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

  return asideRef;
}

export default function SideNav({ groups, activeTab, onSelect, userName, roleLabel, onLogout, open, onClose, label }: {
  groups: NavGroup[];
  activeTab: string;
  onSelect: (key: string) => void;
  userName: string;
  roleLabel: string;
  onLogout: () => void;
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
                    onClick={() => onSelect(item.key)}
                  >
                    <Icon name={item.icon} />
                    <span className="sidenav-item-label">{item.label}</span>
                    {item.count !== undefined && <span className="sidenav-count">{item.count}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidenav-user">
          <Avatar name={userName} online />
          <div className="sidenav-who">
            <b>{userName}</b>
            <span>{roleLabel}</span>
          </div>
          <button type="button" className="icon-btn" onClick={onLogout} aria-label="Wyloguj" title="Wyloguj">
            <Icon name="out" />
          </button>
        </div>
      </aside>
    </>
  );
}
