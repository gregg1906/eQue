import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { ThemePreference } from '../lib/theme';
import { showToast } from './ui/useToast';
import Button from './ui/Button';
import { Field, Input } from './ui/Field';
import Icon from './ui/Icon';
import Segmented from './ui/Segmented';

const THEME_HINT: Record<ThemePreference, string> = {
  light: 'Jasne tło przez cały dzień.',
  dark: 'Ciemne tło, mniej zmęczenia oczu wieczorem.',
  system: 'Motyw zmienia się razem z ustawieniem systemu.',
};

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const tooShort = newPassword.length > 0 && newPassword.length < 6;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = currentPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showToast('Zmieniono hasło. Użyj go przy następnym logowaniu.');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Nie udało się zmienić hasła. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card card-pad" aria-labelledby="password-title">
      <div className="flex items-center gap-2.5 text-brand-text">
        <Icon name="lock" />
        <h2 className="card-title" id="password-title">Hasło i bezpieczeństwo</h2>
      </div>
      <p className="card-sub mb-5">Zmień hasło używane do logowania na to konto.</p>

      <form onSubmit={handleSubmit}>
        {formError && (
          <div className="form-error" role="alert"><Icon name="alert" /><span>{formError}</span></div>
        )}
        <Field label="Obecne hasło">
          <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="Nowe hasło" error={tooShort ? 'Nowe hasło musi mieć co najmniej 6 znaków.' : null} hint="Co najmniej 6 znaków.">
          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Powtórz nowe hasło" error={mismatch ? 'Hasła nie są identyczne. Wpisz nowe hasło jeszcze raz.' : null}>
          <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <div>
          <Button type="submit" variant="primary" disabled={!canSubmit}>
            {submitting ? 'Zapisywanie…' : 'Zmień hasło'}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default function AdminSettings({ theme, onThemeChange }: { theme: ThemePreference; onThemeChange: (t: ThemePreference) => void }) {
  return (
    <div className="settings">
      <section className="card card-pad" aria-labelledby="theme-title">
        <h2 className="card-title" id="theme-title">Motyw aplikacji</h2>
        <p className="card-sub mb-5">Wybierz wygląd panelu eQue na tym urządzeniu.</p>
        <Segmented
          label="Motyw"
          value={theme}
          onChange={onThemeChange}
          options={[
            { value: 'light', label: <><Icon name="sun" size={16} />Jasny</>, ariaLabel: 'Jasny' },
            { value: 'dark', label: <><Icon name="moon" size={16} />Ciemny</>, ariaLabel: 'Ciemny' },
            { value: 'system', label: <><Icon name="monitor" size={16} />Systemowy</>, ariaLabel: 'Systemowy' },
          ]}
        />
        <p className="field-hint mt-3">{THEME_HINT[theme]}</p>
      </section>

      <ChangePasswordCard />
    </div>
  );
}
