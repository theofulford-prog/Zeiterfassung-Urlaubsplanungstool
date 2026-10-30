// Liest Vertragskonditionen aus einem Formular und prüft sie. Gibt bei Fehlern eine Meldung für die Oberfläche zurück.
import { isValidISO } from "./dates";

export type TermsInput = {
  validFrom: string;
  weeklyHours: number | null;
  workDays: number[];
  vacationDaysPerYear: number;
  payType: "MONTHLY" | "HOURLY";
  payAmount: number | null;
  costRate: number;
};

/** Zahl mit Komma oder Punkt; leer = null, unlesbar = NaN. */
function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function parseTermsForm(form: FormData): TermsInput | string {
  const validFrom = String(form.get("validFrom") ?? "").trim();
  if (!isValidISO(validFrom)) return "Bitte ein gültiges Gültig-ab-Datum angeben.";

  const weeklyHours = num(form.get("weeklyHours"));
  if (weeklyHours !== null) {
    if (Number.isNaN(weeklyHours) || weeklyHours <= 0) return "Bitte gültige Wochenstunden angeben (leer = kein Soll).";
    if (weeklyHours > 60) return "Wochenstunden dürfen höchstens 60 sein.";
  }

  const workDays = [...new Set(form.getAll("workDays").map((d) => Number(d)))]
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
    .sort((a, b) => a - b);
  if (workDays.length === 0) return "Bitte mindestens einen Arbeitstag wählen.";

  const vacationDaysPerYear = num(form.get("vacationDaysPerYear")) ?? 0;
  if (Number.isNaN(vacationDaysPerYear) || vacationDaysPerYear < 0 || vacationDaysPerYear > 60) {
    return "Urlaubstage bitte zwischen 0 und 60 angeben.";
  }
  if (Math.round(vacationDaysPerYear * 2) !== vacationDaysPerYear * 2) return "Urlaubstage bitte in halben Tagen angeben.";

  const payType = String(form.get("payType") ?? "");
  if (payType !== "MONTHLY" && payType !== "HOURLY") return "Bitte eine gültige Vergütungsart wählen.";

  const payAmount = num(form.get("payAmount"));
  const costRate = num(form.get("costRate")) ?? 0;
  if ((payAmount !== null && (Number.isNaN(payAmount) || payAmount < 0)) || Number.isNaN(costRate) || costRate < 0) {
    return "Bitte gültige Beträge eingeben.";
  }

  return { validFrom, weeklyHours, workDays, vacationDaysPerYear, payType, payAmount, costRate };
}
