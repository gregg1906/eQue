import { useEffect, useState } from 'react';
import { useWsStatus } from '../../lib/useWsStatus';
import Button from './Button';

const STALE_AFTER_MS = 10000;

/**
  „Na żywo” / „Łączenie ponownie…” — stan WebSocketu zamiast przycisku „Odśwież”.
  Ręczne odświeżenie pojawia się dopiero, gdy połączenie nie wraca przez ~10 s.
*/
export default function LiveIndicator({ onRefresh }: { onRefresh?: () => Promise<void> | void }) {
  const status = useWsStatus();
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const lost = status === 'reconnecting';
    const id = setTimeout(() => setStale(lost), lost ? STALE_AFTER_MS : 0);
    return () => clearTimeout(id);
  }, [status]);

  const lost = status === 'reconnecting';

  const refresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  return (
    <span className="inline-flex items-center gap-3">
      <span
        className={lost ? 'live is-lost' : 'live'}
        role="status"
        title={lost ? 'Brak połączenia na żywo — próbujemy połączyć się ponownie' : 'Zmiany docierają same, bez odświeżania'}
      >
        <span className="live-dot" aria-hidden="true" />
        {lost ? 'Łączenie ponownie…' : 'Na żywo'}
      </span>
      {lost && stale && onRefresh && (
        <Button size="sm" icon="refresh" onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Odświeżanie…' : 'Odśwież dane'}
        </Button>
      )}
    </span>
  );
}
