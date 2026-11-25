import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../lib/api';
import type { ManualTicketResult } from '../lib/apiTypes';
import { confirmDiscard } from '../lib/formGuards';
import Button from './ui/Button';
import Drawer from './ui/Drawer';
import { Field, Input } from './ui/Field';
import Icon from './ui/Icon';
import QueueLetter from './ui/QueueLetter';
import TicketCode from './ui/TicketCode';

function waitText(minutes: number) {
  return minutes <= 0 ? 'Za chwilę' : `Ok. ${minutes} min`;
}

function aheadText(count: number) {
  if (count === 0) return 'Pierwsza w kolejce';
  if (count === 1) return '1 osoba';
  const lastTwo = count % 100;
  const few = count % 10 >= 2 && count % 10 <= 4 && !(lastTwo >= 12 && lastTwo <= 14);
  return `${count} ${few ? 'osoby' : 'osób'}`;
}

/**
  Ręczne dodanie osoby bez telefonu (F3). Po zapisie okno zamienia się w „kartkę z numerem”:
  duży kod biletu do przekazania osobie, a pod nim ile osób jest przed nią.
  Montować z nowym `key` przy każdym otwarciu — stan formularza zaczyna wtedy od zera.
*/
export default function AddPersonDrawer({ open, onClose, locationName, queueCode, accepting, onSubmit }: {
  open: boolean;
  onClose: () => void;
  locationName: string;
  queueCode: string;
  /** Zapisy wstrzymane → serwer odrzuci dodanie (409), więc od razu mówimy dlaczego. */
  accepting: boolean;
  onSubmit: (customerName: string | null) => Promise<ManualTicketResult>;
}) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ManualTicketResult | null>(null);
  const [resultName, setResultName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);

  // Po zapisie fokus na „Gotowe” (pole zniknęło); po „Dodaj kolejną osobę” wraca do pola.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => (result ? doneRef.current : inputRef.current)?.focus());
    return () => cancelAnimationFrame(raf);
  }, [result, open]);

  const requestClose = async () => {
    if (!(await confirmDiscard(!result && name.trim() !== ''))) return;
    onClose();
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting || !accepting) return;
    setSubmitting(true);
    setError(null);
    const trimmed = name.trim();
    try {
      const res = await onSubmit(trimmed || null);
      setResultName(trimmed || null);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nie udało się dodać osoby. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const another = () => {
    setResult(null);
    setResultName(null);
    setName('');
  };

  return (
    <Drawer
      open={open}
      onClose={requestClose}
      title="Dodaj osobę do kolejki"
      leading={<QueueLetter letter={queueCode} size="lg" />}
      footer={result ? (
        <>
          <Button onClick={another}>Dodaj kolejną osobę</Button>
          <span className="grow" />
          <Button ref={doneRef} variant="primary" onClick={onClose}>Gotowe</Button>
        </>
      ) : (
        <>
          <Button onClick={requestClose}>Anuluj</Button>
          <span className="grow" />
          <Button variant="primary" onClick={() => submit()} disabled={submitting || !accepting}>
            {submitting ? 'Dodawanie…' : 'Dodaj do kolejki'}
          </Button>
        </>
      )}
    >
      {result ? (
        <div className="added" role="status">
          <span className="added-label">Numer biletu</span>
          <TicketCode code={result.ticket_code} size="hero" className="serving-code-anim" />
          {resultName && <b className="added-name">{resultName}</b>}
          <p className="added-hint">Przekaż ten numer osobie. Zobaczy go na kiosku, gdy przyjdzie jej kolej.</p>
          <dl className="added-meta">
            <div><dt>Przed nią</dt><dd>{aheadText(result.queue_position)}</dd></div>
            <div><dt>Czas oczekiwania</dt><dd>{waitText(result.estimated_wait_time_minutes)}</dd></div>
          </dl>
          <span className="sr-only">Dodano osobę do kolejki {locationName}. Numer biletu {result.ticket_code}.</span>
        </div>
      ) : (
        <form className="contents" onSubmit={submit}>
          {!accepting && (
            <div className="note" role="note">
              <Icon name="pause" />
              <span>Zapisy do tej kolejki są wstrzymane. Włącz „Nowe zapisy” po prawej, żeby dodać osobę.</span>
            </div>
          )}
          {error && <div className="form-error" role="alert"><Icon name="alert" /><span>{error}</span></div>}
          <Field label="Imię i nazwisko (opcjonalnie)" hint="Pojawi się na liście i obok numeru. Zostaw puste, jeśli osoba nie chce go podawać.">
            <Input
              ref={inputRef}
              maxLength={120}
              autoComplete="off"
              value={name}
              onChange={e => { setName(e.target.value); setError(null); }}
              placeholder="np. Jan Kowalski"
            />
          </Field>
          <div className="note">
            <Icon name="info" />
            <span>Osoba dostanie kolejny numer w kolejce „{locationName}”, taki sam jak przy zapisie z kiosku.</span>
          </div>
          <button type="submit" hidden />
        </form>
      )}
    </Drawer>
  );
}
