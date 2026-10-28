import { forwardRef, useId } from 'react';

interface FloatingInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string;
  hint?: React.ReactNode;
}

/**
  Pole z etykietą w środku: po kliknięciu (albo gdy jest wartość) etykieta zmniejsza się i jedzie w górę.
  Stan liczy CSS (:focus, :placeholder-shown, :autofill), więc działa też z autouzupełnianiem przeglądarki.
*/
const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(function FloatingInput(
  { label, hint, id: idProp, className, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="float-field">
      <div className="float-control">
        {/* placeholder=" " jest potrzebny do :placeholder-shown — sam w sobie jest niewidoczny */}
        <input
          ref={ref}
          id={id}
          placeholder=" "
          aria-describedby={hintId}
          className={className ? `input input-float ${className}` : 'input input-float'}
          {...rest}
        />
        <label className="float-label" htmlFor={id}>{label}</label>
      </div>
      {hint && <span className="field-hint" id={hintId}>{hint}</span>}
    </div>
  );
});

export default FloatingInput;
