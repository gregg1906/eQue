import { forwardRef, useState } from 'react';
import Icon from './Icon';
import { Input } from './Field';

/** Przycisk „pokaż / ukryj hasło” (oko otwarte = hasło widoczne, zamknięte = ukryte). */
export function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="pw-toggle"
      onClick={onToggle}
      onMouseDown={e => e.preventDefault()} // nie zabieraj fokusu polu hasła
      aria-label={shown ? 'Ukryj hasło' : 'Pokaż hasło'}
      aria-pressed={shown}
      title={shown ? 'Ukryj hasło' : 'Pokaż hasło'}
    >
      <Icon name={shown ? 'eye' : 'eyeOff'} />
    </button>
  );
}

/** Pole hasła z podglądem. Zastępuje <Input type="password" /> (korzysta z <Field>). */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>>(
  function PasswordInput({ className, ...rest }, ref) {
    const [shown, setShown] = useState(false);
    const hasValue = String(rest.value ?? '').length > 0;
    if (!hasValue && shown) setShown(false); // puste pole: po ponownym wpisaniu znów zaczyna od ukrytego
    return (
      <div className="pw-wrap">
        <Input ref={ref} {...rest} type={shown ? 'text' : 'password'} className={className ? `pw-input ${className}` : 'pw-input'} />
        {hasValue && <PasswordToggle shown={shown} onToggle={() => setShown(v => !v)} />}
      </div>
    );
  },
);
