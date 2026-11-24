import type { SortDir } from '../../lib/useTableSort';

/**
  Nagłówek kolumny sortowalnej tabeli: przycisk (działa z klawiatury). Strzałka pojawia się dopiero po
  kliknięciu — w górę dla A→Z, w dół dla Z→A. Bez sortowania po najechaniu widać blady podgląd pierwszego kliknięcia.
  `dir` — aktualny kierunek tej kolumny albo null, gdy tabela nie jest po niej posortowana.
*/
export default function SortHeader({ children, dir, onToggle }: { children: React.ReactNode; dir: SortDir | null; onToggle: () => void }) {
  return (
    <th aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : undefined}>
      <button type="button" className={dir ? 'sort-btn is-sorted' : 'sort-btn'} onClick={onToggle}>
        {children}
        <svg className="sort-ico" viewBox="0 0 12 16" aria-hidden="true" focusable="false">
          <path d={dir === 'desc' ? 'M6 3v10M2.5 9.5L6 13l3.5-3.5' : 'M6 13V3M2.5 6.5L6 3l3.5 3.5'} />
        </svg>
      </button>
    </th>
  );
}
