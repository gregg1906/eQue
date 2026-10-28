import { useEffect, useState } from 'react';

/** Wymusza ponowne wyrenderowanie co `ms` — np. żeby czasy oczekiwania szły dalej. */
export function useTick(ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return tick;
}
