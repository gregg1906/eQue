import { useEffect, useState } from 'react';
import { api } from './api';
import { ws, type WsMessage } from './ws';
import type { LocationResponse, QueueResponse } from './apiTypes';

/** Łączna liczba czekających w aktywnych lokalizacjach operatora — licznik w menu przy „Kolejka na żywo”. */
export function useWaitingTotal(locationIds: number[], enabled: boolean): number | undefined {
  const [total, setTotal] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled || locationIds.length === 0) return;
    let cancelled = false;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const locs = (await api.get<LocationResponse[]>('/admin/locations'))
          .filter(l => l.is_active && locationIds.includes(l.id));
        const queues = await Promise.all(locs.map(l => api.get<QueueResponse>(`/admin/locations/${l.id}/queue`)));
        if (!cancelled) setTotal(queues.reduce((sum, q) => sum + q.waiting.length, 0));
      } catch {
        // zostaw ostatnią znaną wartość
      }
    };
    const schedule = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(load, 400);
    };
    const onTicket = (msg: WsMessage) => {
      const locId = (msg.ticket as { location_id?: number } | undefined)?.location_id;
      if (typeof locId === 'number' && locationIds.includes(locId)) schedule();
    };

    const initial = setTimeout(load, 0);
    const offCreated = ws.on('ticket.created', onTicket);
    const offUpdated = ws.on('ticket.updated', onTicket);
    const offLocation = ws.on('location.updated', schedule);
    const offReconnect = ws.onReconnect(schedule);
    return () => {
      cancelled = true;
      clearTimeout(initial);
      if (debounce) clearTimeout(debounce);
      offCreated(); offUpdated(); offLocation(); offReconnect();
    };
  }, [locationIds, enabled]);

  return enabled && locationIds.length > 0 ? total : undefined;
}
