import { useState } from 'react';

export type SortDir = 'asc' | 'desc';
export interface SortState<K extends string> { key: K; dir: SortDir }

/**
  Sortowanie tabeli po kliknięciu nagłówka — naraz tylko jedna kolumna.
  Kliknięcia tej samej kolumny: A→Z → Z→A → z powrotem do domyślnego porządku tabeli.
  Kliknięcie innej kolumny zaczyna od A→Z i zdejmuje sortowanie z poprzedniej.
*/
export function useTableSort<K extends string>() {
  const [sort, setSort] = useState<SortState<K> | null>(null);

  const toggle = (key: K) => setSort(prev => {
    if (prev?.key !== key) return { key, dir: 'asc' };
    return prev.dir === 'asc' ? { key, dir: 'desc' } : null;
  });

  /** Kierunek do pokazania przy kolumnie; null = kolumna nie jest sortowana (bez strzałki). */
  const indicator = (key: K): SortDir | null => (sort?.key === key ? sort.dir : null);

  return { sort, toggle, indicator };
}

type Cell = string | number | null | undefined;

const collator = new Intl.Collator('pl', { sensitivity: 'base', numeric: true });

/**
  Zwraca wiersze w kolejności wybranej kolumny. Puste wartości („Nikt”, „Brak kiosku”, „–”) zawsze na końcu,
  remisy rozstrzyga porządek domyślny. Bez sortowania (null) zwraca wiersze bez zmian.
*/
export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K> | null,
  accessors: Record<K, (row: T) => Cell>,
  fallback: (a: T, b: T) => number,
): T[] {
  if (!sort) return rows;
  const get = accessors[sort.key];
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    const xEmpty = x === null || x === undefined || x === '';
    const yEmpty = y === null || y === undefined || y === '';
    if (xEmpty || yEmpty) return xEmpty && yEmpty ? fallback(a, b) : xEmpty ? 1 : -1;
    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y));
    return cmp !== 0 ? sign * cmp : fallback(a, b);
  });
}
