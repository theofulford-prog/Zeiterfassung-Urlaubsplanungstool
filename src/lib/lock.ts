import { addMonths, monthStart, todayISO } from "./dates";
import { can } from "./permissions";

/** Bis zu diesem Tag des Folgemonats können Mitarbeitende den Vormonat noch korrigieren. */
export const LOCK_DAY = 5;

/** Frühester Tag, den Mitarbeitende noch bearbeiten dürfen (Monatsabschluss). GF darf immer. */
export function editableFrom(today = todayISO()): string {
  const thisMonth = monthStart(today);
  return Number(today.slice(8)) <= LOCK_DAY ? addMonths(thisMonth, -1) : thisMonth;
}

export function canEditDate(date: string, role: string, today = todayISO()): boolean {
  if (can(role, "time.editAll")) return true;
  return date >= editableFrom(today) && date <= today;
}

export function lockMessage(date: string, today = todayISO()): string {
  if (date > today) return "Zeiten können nicht im Voraus erfasst werden.";
  return `Dieser Zeitraum ist abgeschlossen (Korrekturen bis zum ${LOCK_DAY}. des Folgemonats). Bitte an die Geschäftsführung wenden.`;
}
