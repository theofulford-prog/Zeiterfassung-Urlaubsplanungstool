// Vertragskonditionen mit Gültig-ab-Datum: Änderungen gelten ab einem Stichtag, die Vergangenheit bleibt unverändert.
import { addDays } from "./dates";

export type TermsLike = {
  validFrom: string;
  /** null = kein Soll (z. B. Minijob oder Stundenlohn ohne feste Stunden) */
  weeklyHours: number | null;
  /** Arbeitstage als ISO-Wochentage, Mo = 1 … So = 7 */
  workDays: number[];
  vacationDaysPerYear: number;
  costRate: number;
};

const byValidFrom = <T extends { validFrom: string }>(terms: readonly T[]) =>
  [...terms].sort((a, b) => (a.validFrom < b.validFrom ? -1 : a.validFrom > b.validFrom ? 1 : 0));

/** Die am Tag gültigen Konditionen (jüngste mit validFrom <= date), sonst null. */
export function termsOn<T extends { validFrom: string }>(terms: readonly T[], date: string): T | null {
  let found: T | null = null;
  for (const t of byValidFrom(terms)) {
    if (t.validFrom <= date) found = t;
    else break;
  }
  return found;
}

/** Zerlegt [from, to] in Abschnitte mit jeweils gültigen Konditionen; Tage vor der ersten Kondition fehlen. */
export function termSegments<T extends { validFrom: string }>(
  terms: readonly T[],
  from: string,
  to: string,
): { from: string; to: string; terms: T }[] {
  const sorted = byValidFrom(terms);
  const out: { from: string; to: string; terms: T }[] = [];
  sorted.forEach((t, i) => {
    const next = sorted[i + 1];
    const segFrom = t.validFrom > from ? t.validFrom : from;
    const end = next ? addDays(next.validFrom, -1) : to;
    const segTo = end < to ? end : to;
    if (segFrom <= segTo) out.push({ from: segFrom, to: segTo, terms: t });
  });
  return out;
}
