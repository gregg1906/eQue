/** Kod biletu w Space Grotesk z cyframi o stałej szerokości. `hero` = kod na panelu obsługi (--text-code). */
export default function TicketCode({ code, size = 'list', state = 'default', className, style }: {
  code: string;
  size?: 'list' | 'hero';
  state?: 'default' | 'called' | 'done';
  className?: string;
  style?: React.CSSProperties;
}) {
  const classes = ['ticket'];
  if (size === 'hero') classes.push('ticket-hero');
  if (state === 'called') classes.push('is-called');
  if (state === 'done') classes.push('is-done');
  if (className) classes.push(className);
  return <span className={classes.join(' ')} style={style}>{code}</span>;
}
