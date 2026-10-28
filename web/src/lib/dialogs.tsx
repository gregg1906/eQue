import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { setDialogDispatcher, type DialogRequest } from './dialog-actions';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';


export function DialogHost() {
  const [pending, setPending] = useState<DialogRequest | null>(null);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const textId = useId();

  useEffect(() => {
    setDialogDispatcher((req: DialogRequest) => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      settledRef.current = false;
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPending(req);
      requestAnimationFrame(() => setVisible(true));
    });
    return () => { setDialogDispatcher(null); };
  }, []);

  const settle = useCallback((value: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setVisible(false);
    closeTimer.current = setTimeout(() => {
      setPending(p => { p?.resolve(value); return null; });
      const back = returnFocusRef.current;
      if (back?.isConnected) back.focus();
    }, 200);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const raf = requestAnimationFrame(() => confirmRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); settle(false); }
      // Enter na przycisku uruchamia ten przycisk (np. „Anuluj”), a nie potwierdzenie
      if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); settle(true); }
      if (e.key === 'Tab') {
        const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
        if (buttons.length === 0) return;
        const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx <= 0 ? buttons.length - 1 : idx - 1) : (idx + 1) % buttons.length;
        buttons[next].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); };
  }, [pending, settle]);

  if (!pending) return null;

  const danger = pending.tone === 'danger';

  return createPortal(
    <div
      className={visible ? 'dialog-scrim is-visible' : 'dialog-scrim'}
      onMouseDown={e => { if (e.target === e.currentTarget) settle(false); }}
    >
      <div
        ref={dialogRef}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={pending.title ? titleId : undefined}
        aria-describedby={textId}
      >
        <div className="flex items-start gap-3.5">
          <span className={danger ? 'dialog-icon is-danger' : 'dialog-icon'}>
            <Icon name={danger ? 'alert' : 'info'} />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            {pending.title && <h2 className="dialog-title" id={titleId}>{pending.title}</h2>}
            <p className="dialog-text" id={textId}>{pending.message}</p>
          </div>
        </div>

        <div className="dialog-actions">
          {pending.kind === 'confirm' && (
            <Button variant="secondary" onClick={() => settle(false)}>
              {pending.cancelLabel ?? 'Anuluj'}
            </Button>
          )}
          <Button
            ref={confirmRef}
            variant={danger ? 'danger' : 'primary'}
            className={danger ? 'btn-danger-solid' : undefined}
            onClick={() => settle(true)}
          >
            {pending.confirmLabel ?? (pending.kind === 'confirm' ? 'Potwierdź' : 'OK')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
