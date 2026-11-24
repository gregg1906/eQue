export type StatusTone = 'waiting' | 'serving' | 'served' | 'skipped' | 'paused' | 'online' | 'offline' | 'neutral';

/** Status jako znak (kropka, romb, pauza…) i słowo w kolorze statusu — bez tła i ramki. */
export default function StatusPill({ tone, children, title }: { tone: StatusTone; children: React.ReactNode; title?: string }) {
  return (
    <span className={tone === 'neutral' ? 'pill' : `pill pill-${tone}`} title={title}>
      {children}
    </span>
  );
}
