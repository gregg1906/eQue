/** Polska odmiana liczebnika: plural(2, ['osoba', 'osoby', 'osób']) → 'osoby'. */
export function plural(n: number, forms: [one: string, few: string, many: string]): string {
  if (n === 1) return forms[0];
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return forms[1];
  return forms[2];
}
