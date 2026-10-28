import { createContext, useContext } from 'react';

export interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

/** Id, aria-describedby i aria-invalid dla kontrolki wewnątrz <Field>. */
export function useFieldControl() {
  return useContext(FieldContext);
}
