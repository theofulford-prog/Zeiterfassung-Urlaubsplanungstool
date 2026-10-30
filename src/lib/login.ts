import { hasAccessOn } from "./employment";

/**
 * Grund, warum sich eine Person (nach korrektem Passwort) nicht anmelden darf – sonst null.
 * Personen ohne eigenen Zugang (kein Passwort) werden von ihrer Leitung erfasst.
 */
export function loginBlockReason(
  user: { passwordHash: string | null; active: boolean; accessWithoutEmployment: boolean },
  emps: readonly { id: string; startDate: string; endDate: string | null }[],
  today: string,
): string | null {
  if (!user.passwordHash) return "Für diese Person ist kein Zugang eingerichtet.";
  if (!user.active || !hasAccessOn(user, emps, today)) return "Dieser Zugang ist nicht mehr aktiv.";
  return null;
}
