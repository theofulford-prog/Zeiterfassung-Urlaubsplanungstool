// Arbeitsverhältnisse: Eine Person kann bei mehreren Gesellschaften angestellt sein (je ein Vertrag).
import { formatDate } from "./dates";

export const CONTRACT_TYPES = {
  PERMANENT: "Unbefristet",
  FIXED_TERM: "Befristet",
  MINIJOB: "Minijob",
  WORKING_STUDENT: "Werkstudent:in",
  APPRENTICE: "Ausbildung",
  INTERN: "Praktikum",
} as const;
export type ContractType = keyof typeof CONTRACT_TYPES;

type Span = { id: string; startDate: string; endDate: string | null };

/** Besteht das Arbeitsverhältnis an diesem Tag (zwischen Eintritt und letztem Arbeitstag)? */
export function isEmployedOn(emp: Span, date: string): boolean {
  return emp.startDate <= date && (!emp.endDate || date <= emp.endDate);
}

export function activeEmploymentsOn<T extends Span>(emps: readonly T[], date: string): T[] {
  return emps.filter((e) => isEmployedOn(e, date));
}

/**
 * Auf welches Arbeitsverhältnis geht eine Buchung an diesem Tag? Besteht nur eines, wird es ohne Rückfrage gewählt.
 * Gibt bei Problemen eine Meldung für die Oberfläche zurück.
 */
export function resolveEmployment<T extends Span>(emps: readonly T[], date: string, requestedId?: string | null): T | string {
  const active = activeEmploymentsOn(emps, date);
  if (requestedId) {
    return active.find((e) => e.id === requestedId) ?? `Dieses Arbeitsverhältnis besteht am ${formatDate(date)} nicht.`;
  }
  if (active.length === 1) return active[0];
  if (active.length === 0) return `Am ${formatDate(date)} besteht kein Arbeitsverhältnis.`;
  return "Bitte das Arbeitsverhältnis wählen.";
}

/**
 * Zugang zur App: mit Kennzeichen „Zugang ohne Arbeitsverhältnis“ immer, sonst solange irgendein Arbeitsverhältnis
 * noch nicht beendet ist – auch ein künftiges (Zugang vor dem ersten Arbeitstag).
 */
export function hasAccessOn(user: { accessWithoutEmployment: boolean }, emps: readonly Span[], date: string): boolean {
  return user.accessWithoutEmployment || emps.some((e) => !e.endDate || e.endDate >= date);
}

/** Letzter Arbeitstag der Person über alle Arbeitsverhältnisse – nur wenn jedes ein Ende hat, sonst null. */
export function lastWorkingDay(emps: readonly Span[]): string | null {
  if (emps.length === 0 || emps.some((e) => !e.endDate)) return null;
  return emps.map((e) => e.endDate!).sort()[emps.length - 1];
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Arbeitstage lesbar: [1,2,3,4,5] → "Mo–Fr", [1,3,5] → "Mo, Mi, Fr". */
export function formatWorkDays(days: readonly number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (contiguous && sorted.length > 2) return `${WEEKDAYS[sorted[0] - 1]}–${WEEKDAYS[sorted[sorted.length - 1] - 1]}`;
  return sorted.map((d) => WEEKDAYS[d - 1]).join(", ");
}

/**
 * Automatisch sperren (täglicher Lauf bzw. beim Beenden): nur wer Arbeitsverhältnisse hatte und keines mehr besteht.
 * Neu angelegte Personen ohne Arbeitsverhältnis bleiben aktiv, bis Personal es anlegt – anmelden können sie sich trotzdem nicht.
 */
export function shouldAutoDeactivate(user: { accessWithoutEmployment: boolean }, emps: readonly Span[], date: string): boolean {
  return !user.accessWithoutEmployment && emps.length > 0 && !hasAccessOn(user, emps, date);
}

/**
 * Wird der Eintritt verschoben, ziehen die ersten Konditionen mit – solange keine späteren Konditionen davor lägen.
 * Ergebnis: neues Gültig-ab der ersten Konditionen, nichts zu tun ({}) oder eine Meldung.
 */
export function firstTermsStartAfter(newStart: string, validFroms: readonly string[]): { shiftTo?: string; error?: string } {
  const sorted = [...validFroms].sort();
  if (sorted.length === 0 || sorted[0] === newStart) return {};
  if (sorted.length > 1 && sorted[1] <= newStart) {
    return { error: "Es gibt Konditionen vor dem neuen Eintrittsdatum. Bitte zuerst die Konditionen anpassen." };
  }
  return { shiftTo: newStart };
}
