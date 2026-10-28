import { useRef } from 'react';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  /** Litera kolejki przed nazwą (przełącznik lokalizacji). */
  letter?: string;
  /** Licznik po nazwie, np. liczba czekających. */
  count?: number;
  /** Tekst dla czytników ekranu, gdy label nie jest zwykłym tekstem. */
  ariaLabel?: string;
}

/** Przełącznik segmentowy — wszystkie opcje widać od razu. Strzałki przełączają między opcjami. */
export default function Segmented<T extends string | number>({ options, value, onChange, label, className }: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Dostępna nazwa grupy. */
  label: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    const buttons = rootRef.current?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[next]?.focus();
  };

  const selectedIndex = options.findIndex(o => o.value === value);

  return (
    <div ref={rootRef} className={className ? `seg ${className}` : 'seg'} role="tablist" aria-label={label}>
      {options.map((opt, i) => {
        const selected = i === selectedIndex;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={opt.ariaLabel}
            tabIndex={selected || (selectedIndex < 0 && i === 0) ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={e => onKeyDown(e, i)}
          >
            {opt.letter && <span className="seg-letter">{opt.letter}</span>}
            {opt.label}
            {opt.count !== undefined && <span className="seg-count">{opt.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
