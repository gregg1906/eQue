import { useEffect, useRef } from 'react';
import { ws, type WsMessage } from './ws';
import { getPreferences } from './preferences';

/*
  Krótki dwutonowy sygnał generowany Web Audio API — bez pliku dźwiękowego.
  Przeglądarki pozwalają odtwarzać dźwięk dopiero po interakcji użytkownika;
  w panelu jest nią logowanie, więc sygnał działa przez całą sesję.
*/

let ctx: AudioContext | null = null;

export function playChime() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const start = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      const t = start + i * 0.16;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    // brak Web Audio — sygnał jest tylko dodatkiem
  }
}

const MIN_GAP_MS = 3000;

/**
  Sygnał, gdy ktoś dołączy do kolejki w lokalizacjach operatora (ustawienie „sound_on_new_ticket”).
  Działa na każdym ekranie panelu; kilka zapisów w ciągu 3 s daje jeden sygnał.
*/
export function useNewTicketSound(locationIds: number[], enabled: boolean) {
  const lastRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    return ws.on('ticket.created', (msg: WsMessage) => {
      if (!getPreferences().sound_on_new_ticket) return;
      const locId = (msg.ticket as { location_id?: number } | undefined)?.location_id;
      if (typeof locId !== 'number' || !locationIds.includes(locId)) return;
      const now = Date.now();
      if (now - lastRef.current < MIN_GAP_MS) return;
      lastRef.current = now;
      playChime();
    });
  }, [locationIds, enabled]);
}
