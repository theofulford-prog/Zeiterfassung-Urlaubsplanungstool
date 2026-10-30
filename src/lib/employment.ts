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
