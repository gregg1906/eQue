import { useEffect, useState } from 'react';
import { api } from './api';
import { ws, type WsMessage } from './ws';
import type { LocationResponse, QueueResponse } from './apiTypes';

export interface QueueSummary {
  id: number;
  queue_code: string;
  name: string;
  /** Liczba czekających — liczba przy zakładce kolejki w menu. */
  waiting: number;
}

/**
  Aktywne lokalizacje operatora z liczbą czekających (zakładki w grupie „Kolejki”).
  `undefined` do czasu pierwszego pobrania; potem odświeżane na żywo przez WebSocket.
*/
export function useQueueSummaries(locationIds: number[], enabled: boolean): QueueSummary[] | undefined {
  const [summaries, setSummaries] = useState<QueueSummary[] | undefined>(undefined);

  useEffect(() => {
    if (!enabled || locationIds.length === 0) return;
    let cancelled = false;
    let debounce: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        // alfabetycznie po literze kolejki (A, B, C…), przy tej samej literze po nazwie
        const locs = (await api.get<LocationResponse[]>('/admin/locations'))
          .filter(l => l.is_active && locationIds.includes(l.id))
          .sort((a, b) => a.queue_code.localeCompare(b.queue_code, 'pl') || a.name.localeCompare(b.name, 'pl'));
        const queues = await Promise.all(locs.map(l => api.get<QueueResponse>(`/admin/locations/${l.id}/queue`)));
        if (!cancelled) {
          setSummaries(locs.map((l, i) => ({ id: l.id, queue_code: l.queue_code, name: l.name, waiting: queues[i].waiting.length })));
        }
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

  return enabled && locationIds.length > 0 ? summaries : undefined;
}
