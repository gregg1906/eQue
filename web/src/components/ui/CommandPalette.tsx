import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  run: () => void;
}

/** Paleta poleceń (Ctrl/Cmd+K): zakładki, lokalizacje, akcje operatora, motyw. Montować tylko, gdy otwarta. */
export default function CommandPalette({ items, onClose }: { items: CommandItem[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const q = query.trim().toLowerCase();
  const shown = q ? items.filter(i => `${i.label} ${i.group}`.toLowerCase().includes(q)) : items;
  const active = Math.min(sel, Math.max(0, shown.length - 1));

  useEffect(() => {
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => { if (returnTo?.isConnected) returnTo.focus(); };
  }, []);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (item: CommandItem | undefined) => {
    onClose();
    if (item) item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(Math.min(active + 1, shown.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(Math.max(active - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(shown[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  };

  return createPortal(
    <div className="cmdk-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Szukaj i przejdź">
        <div className="cmdk-in">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSel(0); }}
            onKeyDown={onKeyDown}
            placeholder="Wpisz nazwę ekranu, lokalizacji lub akcji"
            aria-label="Szukaj"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={shown.length ? `${listId}-${active}` : undefined}
            autoComplete="off"
          />
          <kbd aria-hidden="true">Esc</kbd>
        </div>
        <ul ref={listRef} id={listId} role="listbox" aria-label="Wyniki">
          {shown.length === 0 && <li className="cmdk-none" role="presentation">Nic nie pasuje. Spróbuj nazwy ekranu albo lokalizacji.</li>}
          {shown.map((item, i) => (
            <li
              key={item.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => { if (i !== active) setSel(i); }}
              onClick={() => run(item)}
            >
              {item.label}
              <span className="cmdk-group">{item.group}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
