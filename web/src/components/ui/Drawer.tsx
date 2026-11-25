import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { FOCUSABLE, trapTab } from '../../lib/useFocusTrap';

const FIRST_FIELD = '[data-autofocus], input:not([disabled]):not([type="checkbox"]), textarea:not([disabled]), .select-trigger:not([disabled])';

/**
  Panel boczny do szczegółów i edycji. Esc i kliknięcie tła zamykają, fokus trafia na pierwsze pole,
  a po zamknięciu wraca na element, z którego panel otwarto (np. wiersz tabeli).
*/
export default function Drawer({ open, onClose, title, leading, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Element przed tytułem, np. litera kolejki albo avatar. */
  leading?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const target = panel?.querySelector<HTMLElement>(FIRST_FIELD) ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      const back = returnFocusRef.current;
      if (back && back.isConnected) back.focus();
    };
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    trapTab(e, panelRef.current);
  };

  return createPortal(
    <>
      <div className={open ? 'drawer-scrim is-open' : 'drawer-scrim'} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={open ? 'drawer is-open' : 'drawer'}
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-labelledby={titleId}
        inert={!open}
        onKeyDown={onKeyDown}
      >
        <div className="drawer-head">
          {leading}
          <h2 className="drawer-title" id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Zamknij panel">
            <Icon name="x" />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>,
    document.body,
  );
}
