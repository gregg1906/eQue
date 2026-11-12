import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { LocationResponse, TextSize, ThemePreference, UndoSeconds, UserPreferences } from '../lib/apiTypes';
import { updatePreferences, usePreferences } from '../lib/preferences';
import { playChime } from '../lib/sound';
import { sortByName } from '../lib/sort';
import { SYSTEM_MORE_CONTRAST, SYSTEM_REDUCED_MOTION, useMediaQuery } from '../lib/theme';
import { showToast } from './ui/useToast';
import Button from './ui/Button';
import { Field, Input } from './ui/Field';
import Icon from './ui/Icon';
import Segmented from './ui/Segmented';
import Select from './ui/Select';
import Switch from './ui/Switch';

const TEXT_SIZE_HINT: Record<TextSize, string> = {
  normal: 'Standardowa wielkość tekstu (15 px).',
  large: 'Tekst i odstępy o 12,5% większe (ok. 17 px).',
  xlarge: 'Tekst i odstępy o 25% większe (ok. 19 px).',
};

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

/** Zapis jednego ustawienia na koncie; przy błędzie interfejs wraca do poprzedniej wartości. */
function save(patch: Partial<UserPreferences>) {
  updatePreferences(patch).catch(err => {
    const why = err instanceof ApiError ? err.message : 'brak połączenia z serwerem';
    showToast(`Nie udało się zapisać ustawienia: ${why}. Przywrócono poprzednią wartość.`, { tone: 'error' });
  });
}

function ToggleRow({ title, text, checked, onChange, systemNote }: {
  title: string;
  text: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /**
    Ustawienie jest już włączone w systemie operacyjnym — działa niezależnie od przełącznika,
    więc pokazujemy go jako włączony i zablokowany, z wyjaśnieniem zamiast mylącego „wyłączone”.
  */
  systemNote?: string;
}) {
  return (
    <div className="toggle-row">
      <div className="toggle-row-text">
        <b>{title}</b>
        <span>{text}</span>
        {systemNote && <span className="toggle-row-system"><Icon name="monitor" size={14} />{systemNote}</span>}
      </div>
      <Switch checked={checked || !!systemNote} onChange={onChange} label={title} disabled={!!systemNote} />
    </div>
  );
}

function AppearanceCard() {
  const prefs = usePreferences();
  const systemContrast = useMediaQuery(SYSTEM_MORE_CONTRAST);
  const systemMotion = useMediaQuery(SYSTEM_REDUCED_MOTION);
  return (
    <section className="card card-pad" aria-labelledby="appearance-title">
      <h2 className="card-title" id="appearance-title">Wygląd i czytelność</h2>
      <p className="card-sub mb-5">
        Zapisywane automatycznie na Twoim koncie — działają na każdym komputerze, na którym się zalogujesz.
      </p>

      <div className="settings-stack">
        <div className="settings-field">
          <span className="field-label" id="theme-label">Motyw</span>
          <Segmented
            label="Motyw"
            value={prefs.theme}
            onChange={theme => save({ theme })}
            options={[
              { value: 'light', label: <><Icon name="sun" size={16} />Jasny</>, ariaLabel: 'Jasny' },
              { value: 'dark', label: <><Icon name="moon" size={16} />Ciemny</>, ariaLabel: 'Ciemny' },
              { value: 'system', label: <><Icon name="monitor" size={16} />Systemowy</>, ariaLabel: 'Systemowy' },
            ]}
          />
          <p className="field-hint">{THEME_HINT[prefs.theme]}</p>
        </div>

        <div className="settings-field">
          <span className="field-label">Rozmiar tekstu</span>
          <Segmented
            label="Rozmiar tekstu"
            value={prefs.text_size}
            onChange={text_size => save({ text_size })}
            options={[
              { value: 'normal', label: 'Standardowy' },
              { value: 'large', label: 'Duży' },
              { value: 'xlarge', label: 'Bardzo duży' },
            ]}
          />
          <p className="field-hint">{TEXT_SIZE_HINT[prefs.text_size]}</p>
        </div>

        <ToggleRow
          title="Wysoki kontrast"
          text="Ciemniejszy tekst pomocniczy, wyraźniejsze obramowania i grubszy obrys zaznaczenia."
          checked={prefs.high_contrast}
          onChange={high_contrast => save({ high_contrast })}
          systemNote={systemContrast ? 'Włączony w ustawieniach systemu — działa także na ekranie logowania.' : undefined}
        />
        <ToggleRow
          title="Ogranicz animacje"
          text="Panele i powiadomienia pojawiają się bez przesuwania, a migające wskaźniki stoją w miejscu."
          checked={prefs.reduce_motion}
          onChange={reduce_motion => save({ reduce_motion })}
          systemNote={systemMotion ? 'Włączone w ustawieniach systemu — działa także na ekranie logowania.' : undefined}
        />
      </div>
    </section>
  );
}

const UNDO_OPTIONS: { value: UndoSeconds; label: string }[] = [
  { value: 6, label: '6 s' },
  { value: 10, label: '10 s' },
  { value: 20, label: '20 s' },
];

function QueueWorkCard() {
  const prefs = usePreferences();
  const [locations, setLocations] = useState<LocationResponse[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.get<LocationResponse[]>('/admin/locations')
      .then(locs => { if (!cancelled) setLocations(sortByName(locs.filter(l => l.is_active), l => l.name)); })
      .catch(() => { /* lista lokalizacji potrzebna tylko do wyboru domyślnej */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="card card-pad" aria-labelledby="queue-work-title">
      <h2 className="card-title" id="queue-work-title">Praca z kolejką</h2>
      <p className="card-sub mb-5">Dopasuj ekran „Kolejka na żywo” do swojego sposobu pracy.</p>

      <div className="settings-stack">
        <div className="settings-field">
          <span className="field-label">Czas na „Cofnij”</span>
          <Segmented
            label="Czas na Cofnij"
            value={prefs.undo_seconds}
            onChange={undo_seconds => save({ undo_seconds })}
            options={UNDO_OPTIONS}
          />
          <p className="field-hint">
            Tyle sekund masz na cofnięcie wezwania lub zakończenia obsługi. Dłuższy czas przyda się, gdy korzystasz z czytnika ekranu;
            klient dostaje powiadomienie dopiero po tym czasie.
          </p>
        </div>

        <Field label="Domyślna lokalizacja" hint="Ta kolejka otwiera się jako pierwsza po wejściu na ekran „Kolejka na żywo”.">
          <Select
            value={prefs.default_location_id !== null ? String(prefs.default_location_id) : ''}
            onChange={v => save({ default_location_id: v ? Number(v) : null })}
            options={[
              { value: '', label: 'Pierwsza z listy (alfabetycznie)' },
              ...locations.map(l => ({ value: String(l.id), label: `${l.queue_code} · ${l.name}` })),
            ]}
          />
        </Field>

        <div className="settings-field">
          <ToggleRow
            title="Dźwięk przy nowej osobie w kolejce"
            text="Krótki sygnał, gdy ktoś dołączy do kolejki w Twojej lokalizacji — także gdy jesteś na innym ekranie panelu."
            checked={prefs.sound_on_new_ticket}
            onChange={sound_on_new_ticket => {
              save({ sound_on_new_ticket });
              if (sound_on_new_ticket) playChime();
            }}
          />
          <Button size="sm" variant="ghost" icon="bell" className="self-start" onClick={playChime}>Odtwórz sygnał</Button>
        </div>

        <ToggleRow
          title="Skróty jednoklawiszowe"
          text="Enter, N i P działają na ekranie kolejki bez Ctrl. Wyłącz, jeśli sterujesz komputerem głosem albo łatwo o przypadkowe naciśnięcie. Ctrl+K działa zawsze."
          checked={prefs.single_key_shortcuts}
          onChange={single_key_shortcuts => save({ single_key_shortcuts })}
        />
      </div>
    </section>
  );
}

export default function AdminSettings({ isOperator }: { isOperator: boolean }) {
  return (
    <div className="settings">
      <AppearanceCard />
      {isOperator && <QueueWorkCard />}
      <ChangePasswordCard />
    </div>
  );
}
