import { passwordStrength } from '../../lib/passwordPolicy';

/** Wskaźnik siły hasła: tekst jest nośnikiem informacji, pasek tylko ją podkreśla (WCAG 1.4.1). */
export default function PasswordStrength({ password, username }: { password: string; username?: string }) {
  if (!password) return null;
  const { level, label } = passwordStrength(password, username);
  return (
    <div className="mt-1.5 flex items-center gap-2 text-sm" aria-live="polite">
      <span aria-hidden="true" className="flex gap-1">
        {[0, 1].map(i => (
          <span
            key={i}
            className="h-1.5 w-8 rounded-full"
            style={{ background: i < level ? 'var(--teal-700)' : 'var(--slate-300)' }}
          />
        ))}
      </span>
      <span>Siła hasła: {label}</span>
    </div>
  );
}
