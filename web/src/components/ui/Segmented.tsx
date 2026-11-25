import { useRef } from 'react';
import { segmentedTabId } from './segmentedIds';

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
export default function Segmented<T extends string | number>({ options, value, onChange, label, className, panelId }: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Dostępna nazwa grupy. */
  label: string;
  className?: string;
  /**
    Id panelu, który przełącznik zmienia — wtedy to karty (tablist/tab + aria-controls), a wywołujący renderuje
    `<div role="tabpanel" id={panelId} aria-labelledby={segmentedTabId(panelId, value)}>`.
    Bez panelu to zwykły wybór jednej opcji (radiogroup/radio).
  */
  panelId?: string;
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
  const tabs = panelId !== undefined;

  return (
    <div ref={rootRef} className={className ? `seg ${className}` : 'seg'} role={tabs ? 'tablist' : 'radiogroup'} aria-label={label}>
      {options.map((opt, i) => {
        const selected = i === selectedIndex;
        return (
          <button
            key={String(opt.value)}
            type="button"
            id={tabs ? segmentedTabId(panelId, opt.value) : undefined}
            role={tabs ? 'tab' : 'radio'}
            aria-selected={tabs ? selected : undefined}
            aria-checked={tabs ? undefined : selected}
            aria-controls={tabs ? panelId : undefined}
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
