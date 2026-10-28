/**
  Polecenia operatora wywoływane spoza ekranu kolejki (paleta poleceń w App.tsx).
  UserQueue subskrybuje je, gdy jest zamontowany.
*/
export type QueueCommand =
  | { type: 'primary' }
  | { type: 'noshow' }
  | { type: 'togglePause' }
  | { type: 'select'; locationId: number };

const listeners = new Set<(cmd: QueueCommand) => void>();

export function onQueueCommand(handler: (cmd: QueueCommand) => void): () => void {
  listeners.add(handler);
  return () => { listeners.delete(handler); };
}

export function runQueueCommand(cmd: QueueCommand) {
  listeners.forEach(h => h(cmd));
}
