import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { useFieldControl } from './fieldContext';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  /** Dostępna nazwa, gdy Select nie jest w <Field>. */
  ariaLabel?: string;
}

function measure(el: HTMLElement | null) {
  const r = el?.getBoundingClientRect();
  return r ? { top: r.bottom + 6, left: r.left, width: r.width } : null;
}

export default function Select({ value, onChange, options, placeholder = 'Wybierz…', disabled = false, style, ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const field = useFieldControl();
  const listId = useId();

  const selected = options.find(o => o.value === value);

  const openPanel = () => {
    if (disabled) return;
    setRect(measure(triggerRef.current));
    setOpenCount(c => c + 1);
    const idx = options.findIndex(opt => opt.value === value);
    setHighlight(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const choose = (opt: SelectOption | undefined) => {
    if (opt) onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReposition = () => setRect(measure(triggerRef.current));

    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open]);

  // Klawiatura obsługiwana na przycisku (fokus zostaje na nim): Esc zamyka tylko listę, nie panel boczny pod nią.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openPanel(); }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, options.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); choose(options[highlight]); }
    else if (e.key === 'Tab') { setOpen(false); }
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', width: '100%', ...style }}>
      <button
        ref={triggerRef}
        type="button"
        id={field?.id}
        className="input select-trigger"
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
        aria-describedby={field?.describedBy}
        aria-label={ariaLabel}
      >
        <span className={selected ? 'select-value' : 'select-value is-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon name="chevronDown" />
      </button>

      {rect && createPortal(
        <div
          ref={panelRef}
          className="select-panel"
          style={{
            top: rect.top, left: rect.left, width: rect.width,
            transform: open ? 'scaleY(1) translateY(0)' : 'scaleY(0.92) translateY(-6px)',
            opacity: open ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
            visibility: open ? 'visible' : 'hidden',
          }}
        >
          <ul key={openCount} id={listId} role="listbox">
            {options.length === 0 && <li className="select-empty" role="presentation">Brak opcji</li>}
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  className={i === highlight ? 'select-option is-highlighted' : 'select-option'}
                  onMouseMove={() => { if (i !== highlight) setHighlight(i); }}
                  onClick={() => choose(opt)}
                  style={{ animation: open ? `eque-option-in 200ms var(--ease-out) ${Math.min(i, 8) * 16}ms both` : 'none' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                  {isSelected && <Icon name="check" />}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}
