export default function Switch({ checked, onChange, label, disabled, id }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Dostępna nazwa włącznika (aria-label). */
  label: string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}
