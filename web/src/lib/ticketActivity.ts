
export interface ActivityEntry {
  ticketId: string;
  ticketCode: string;
  customerName: string | null;
  locationId: number;
  outcome: 'done' | 'noshow';
  resolvedAt: string;
}

let entries: ActivityEntry[] = [];

export function recordResolved(entry: ActivityEntry) {
  entries = [entry, ...entries];
}

/** Używane przy „Cofnij” i przy błędzie API — akcja nie doszła do skutku. */
export function removeResolved(ticketId: string) {
  entries = entries.filter(e => e.ticketId !== ticketId);
}

export function getActivity(): ActivityEntry[] {
  return entries;
}
