import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { ws, type WsMessage } from './ws';
import type { TicketHistoryEntry, TicketStatus } from './apiTypes';

/** Początek bieżącego dnia w strefie czasowej przeglądarki (placówki), jako ISO. */
export function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const FINISHED: TicketStatus[] = ['COMPLETED', 'CANCELLED'];

/**
  Bilety zakończone dzisiaj w lokalizacjach zalogowanego (GET /admin/tickets/history).
  Zastępuje historię trzymaną wcześniej w pamięci karty: dane są w bazie, więc przetrwają
  odświeżenie strony, są takie same na każdym komputerze i obejmują też zmiany innych operatorów.
  Odświeża się sama po zakończeniu biletu (WebSocket) i po ponownym połączeniu.
*/
export function useShiftHistory(enabled = true) {
  const [entries, setEntries] = useState<TicketHistoryEntry[] | undefined>(undefined);

  const refetch = useCallback(async () => {
    try {
      const since = encodeURIComponent(startOfToday());
      setEntries(await api.get<TicketHistoryEntry[]>(`/admin/tickets/history?since=${since}&limit=500`));
    } catch {
      // zostaw ostatnio znane dane
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(refetch, 300);
    };
    const onUpdated = (msg: WsMessage) => {
      const status = (msg.ticket as { status?: TicketStatus } | undefined)?.status;
      if (status && FINISHED.includes(status)) schedule();
    };
    const initial = setTimeout(refetch, 0);
    const offUpdated = ws.on('ticket.updated', onUpdated);
    const offReconnect = ws.onReconnect(schedule);
    return () => {
      clearTimeout(initial);
      if (debounce) clearTimeout(debounce);
      offUpdated();
      offReconnect();
    };
  }, [enabled, refetch]);

  return { entries, refetch };
}

/** Wynik zakończonego biletu do wyświetlenia na liście „Zakończone”. */
export function outcomeOf(entry: Pick<TicketHistoryEntry, 'status' | 'close_reason'>): 'served' | 'noshow' | 'patient' | 'staff' {
  if (entry.status === 'COMPLETED') return 'served';
  if (entry.close_reason === 'PATIENT_CANCELLED') return 'patient';
  if (entry.close_reason === 'STAFF_CANCELLED') return 'staff';
  return 'noshow'; // NO_SHOW albo starszy bilet bez powodu (wcześniej „anuluj” = nie zgłosił się)
}
