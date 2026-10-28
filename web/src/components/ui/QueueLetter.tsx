/** Litera kolejki lokalizacji w kółku (to, co klient widzi przed numerem biletu). */
export default function QueueLetter({ letter, off = false, size = 'md' }: { letter: string; off?: boolean; size?: 'md' | 'lg' }) {
  const classes = ['qletter'];
  if (off) classes.push('is-off');
  if (size === 'lg') classes.push('qletter-lg');
  return <span className={classes.join(' ')} title={`Kod kolejki ${letter}`}>{letter}</span>;
}
