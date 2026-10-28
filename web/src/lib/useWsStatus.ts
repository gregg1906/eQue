import { useSyncExternalStore } from 'react';
import { ws, type WsStatus } from './ws';

const subscribe = (onChange: () => void) => ws.onStatus(onChange);
const getSnapshot = (): WsStatus => ws.getStatus();

export function useWsStatus(): WsStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
