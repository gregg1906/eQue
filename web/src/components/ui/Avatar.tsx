function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

/* jeden spokojny kolor dla wszystkich — losowa tęcza inicjałów niczego nie mówi, a kolor zostaje dla statusów */
const NEUTRAL = { bg: 'var(--border-subtle)', fg: 'var(--text-strong)' };

/** Inicjały w kółku z kropką obecności. `online: null` — bez kropki. */
export default function Avatar({ name, online = null, active = true, size = 32, tone = 'brand' }: {
  name: string;
  online?: boolean | null;
  active?: boolean;
  size?: number;
  /** 'brand' — teal jak w menu; 'auto' — neutralny (lista pracowników). */
  tone?: 'brand' | 'auto';
}) {
  const colors = !active
    ? { bg: 'var(--surface-sunken)', fg: 'var(--text-muted)' }
    : tone === 'brand'
      ? { bg: 'var(--brand-subtle)', fg: 'var(--text-brand)' }
      : NEUTRAL;
  const dot = Math.max(10, Math.round(size * 0.3));

  return (
    <span className="avatar" style={{ width: size, height: size, background: colors.bg, color: colors.fg, fontSize: size >= 40 ? 15 : 12.5 }} aria-hidden="true">
      {getInitials(name) || '?'}
      {online !== null && (
        <span
          className="avatar-dot"
          style={{
            width: dot, height: dot,
            background: active && online ? 'var(--queue-served)' : 'var(--surface-card)',
            boxShadow: active && online ? undefined : 'inset 0 0 0 2px var(--border-default)',
          }}
        />
      )}
    </span>
  );
}
