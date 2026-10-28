import { createPortal } from 'react-dom';
import Icon from './Icon';
import { dismissToast, useCurrentToast } from './useToast';

/** Miejsce na powiadomienia — montowane raz, w App.tsx. */
export function ToastHost() {
  const toast = useCurrentToast();

  return createPortal(
    <div className="toast-host" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast" role={toast.tone === 'error' ? 'alert' : 'status'}>
          {toast.tone === 'error' && <Icon name="alert" className="toast-icon" />}
          <span className="toast-text">{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => { const undo = toast.undo; dismissToast(toast.id); undo?.(); }}
            >
              Cofnij
            </button>
          )}
          <button type="button" className="icon-btn" aria-label="Zamknij powiadomienie" onClick={() => dismissToast(toast.id)}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
