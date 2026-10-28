/** Klawisz lub kombinacja (np. ['Ctrl', 'K']). Czysto wizualne — skrót opisuje `aria-keyshortcuts`. */
export default function Kbd({ keys }: { keys: string | string[] }) {
  const list = Array.isArray(keys) ? keys : [keys];
  if (list.length === 1) return <kbd aria-hidden="true">{list[0]}</kbd>;
  return (
    <span className="kbd-group" aria-hidden="true">
      {list.map(k => <kbd key={k}>{k}</kbd>)}
    </span>
  );
}
