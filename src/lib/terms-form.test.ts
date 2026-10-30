import { describe, expect, it } from "vitest";
import { parseTermsForm } from "./terms-form";

const form = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    validFrom: "2026-11-01", weeklyHours: "40", workDays: ["1", "2", "3", "4", "5"],
    vacationDaysPerYear: "30", payType: "MONTHLY", payAmount: "3200", costRate: "35", ...o,
  })) for (const x of [v].flat()) f.append(k, x);
  return f;
};

describe("Konditionen aus dem Formular", () => {
  it("liest gültige Konditionen", () => {
    expect(parseTermsForm(form({ weeklyHours: "38,5" }))).toMatchObject({ weeklyHours: 38.5, workDays: [1, 2, 3, 4, 5] });
    expect(parseTermsForm(form({ weeklyHours: "" }))).toMatchObject({ weeklyHours: null });
    expect(parseTermsForm(form({ vacationDaysPerYear: "27,5" }))).toMatchObject({ vacationDaysPerYear: 27.5 });
  });
  it("weist Ungültiges ab", () => {
    expect(parseTermsForm(form({ workDays: [] }))).toBe("Bitte mindestens einen Arbeitstag wählen.");
    expect(parseTermsForm(form({ weeklyHours: "61" }))).toBe("Wochenstunden dürfen höchstens 60 sein.");
    expect(parseTermsForm(form({ vacationDaysPerYear: "27,3" }))).toBe("Urlaubstage bitte in halben Tagen angeben.");
    expect(parseTermsForm(form({ validFrom: "2026-02-30" }))).toBe("Bitte ein gültiges Gültig-ab-Datum angeben.");
    expect(parseTermsForm(form({ payType: "WEEKLY" }))).toBe("Bitte eine gültige Vergütungsart wählen.");
  });
});
