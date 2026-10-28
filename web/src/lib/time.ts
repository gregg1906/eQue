export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Nigdy nie był online';
  const minutes = minutesSince(lastSeenAt);
  if (minutes < 1) return 'Widziano przed chwilą';
  if (minutes < 60) return `Widziano ${minutes} min temu`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Widziano ${hours} godz. temu`;
  return `Widziano ${Math.round(hours / 24)} dni temu`;
}

export function formatOfflineFor(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'nie łączył się jeszcze z systemem';
  const minutes = minutesSince(lastSeenAt);
  if (minutes < 60) return `jest offline od ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `jest offline od ${hours} godz.`;
  return `jest offline od ${Math.round(hours / 24)} dni`;
}

/** Czas oczekiwania, od którego wyróżniamy go bursztynem. */
export const LONG_WAIT_MIN = 15;
