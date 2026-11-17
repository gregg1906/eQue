import type { SortDir } from '../../lib/useTableSort';

/**
  Nagłówek kolumny sortowalnej tabeli: przycisk (działa z klawiatury) ze strzałkami góra/dół.
  `dir` — aktualny kierunek tej kolumny albo null, gdy tabela jest posortowana po innej.
*/
export default function SortHeader({ children, dir, onToggle }: { children: React.ReactNode; dir: SortDir | null; onToggle: () => void }) {
  return (
    <th aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}>
      <button type="button" className={dir ? 'sort-btn is-sorted' : 'sort-btn'} onClick={onToggle}>
        {children}
        <svg className="sort-ico" viewBox="0 0 12 16" aria-hidden="true" focusable="false">
          <path className={dir === 'asc' ? 'is-on' : undefined} d="M2.5 6.5L6 3l3.5 3.5" />
          <path className={dir === 'desc' ? 'is-on' : undefined} d="M2.5 9.5L6 13l3.5-3.5" />
        </svg>
      </button>
    </th>
  );
}
