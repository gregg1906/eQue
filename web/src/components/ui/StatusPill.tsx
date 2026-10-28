export type StatusTone = 'waiting' | 'serving' | 'served' | 'skipped' | 'paused' | 'online' | 'offline' | 'neutral';

/** Status jako pigułka z kropką i słowem, pisany zdaniem („Oczekuje”, nie „OCZEKUJE”). */
export default function StatusPill({ tone, children, title }: { tone: StatusTone; children: React.ReactNode; title?: string }) {
  return (
    <span className={tone === 'neutral' ? 'pill' : `pill pill-${tone}`} title={title}>
      {children}
    </span>
  );
}
