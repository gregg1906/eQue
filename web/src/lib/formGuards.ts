import { confirmDialog } from './dialog-actions';

/** Przenosi fokus na pierwsze pole z błędem (WCAG 3.3.1). Wołać zaraz po ustawieniu błędów — czeka na ich wyrenderowanie. */
export function focusFirstInvalid() {
  requestAnimationFrame(() => {
    const scope = document.querySelector('.drawer.is-open') ?? document;
    scope.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}

/** Zamknięcie panelu z niezapisanymi zmianami wymaga potwierdzenia (WCAG 3.3.4). Bez zmian zamyka od razu. */
export async function confirmDiscard(dirty: boolean): Promise<boolean> {
  if (!dirty) return true;
  return confirmDialog('Masz niezapisane zmiany. Jeśli zamkniesz panel, zostaną utracone.', {
    title: 'Odrzucić zmiany?',
    tone: 'danger',
    confirmLabel: 'Odrzuć zmiany',
    cancelLabel: 'Wróć do edycji',
  });
}
