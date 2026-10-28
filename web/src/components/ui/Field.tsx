import { forwardRef, useId } from 'react';
import Icon from './Icon';
import { FieldContext, useFieldControl } from './fieldContext';

/** Etykieta nad polem, podpowiedź i błąd pod polem (z instrukcją, jak go naprawić). */
export function Field({ label, hint, error, children, as = 'label' }: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  /** 'group' dla grup kontrolek (np. checklisty) — etykieta nie jest wtedy <label>. */
  as?: 'label' | 'group';
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: !!error }}>
      <div className="field" role={as === 'group' ? 'group' : undefined} aria-labelledby={as === 'group' ? `${id}-label` : undefined}>
        {as === 'label'
          ? <label className="field-label" htmlFor={id}>{label}</label>
          : <span className="field-label" id={`${id}-label`}>{label}</span>}
        {children}
        {error && <span className="field-error" id={errorId}><Icon name="alert" />{error}</span>}
        {hint && <span className="field-hint" id={hintId}>{hint}</span>}
      </div>
    </FieldContext.Provider>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  const field = useFieldControl();
  return (
    <input
      ref={ref}
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={className ? `input ${className}` : 'input'}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 3, ...rest }, ref) {
  const field = useFieldControl();
  return (
    <textarea
      ref={ref}
      id={field?.id}
      rows={rows}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={className ? `input ${className}` : 'input'}
      {...rest}
    />
  );
});
