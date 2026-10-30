import { describe, expect, it } from "vitest";
import {
  employmentTargetHours, employmentVacationAllowance, employmentVacationBalance, personTargetHours, type EmploymentLike,
} from "./stats";

const t = (validFrom: string, weeklyHours: number | null, workDays = [1, 2, 3, 4, 5], vacationDaysPerYear = 30) =>
  ({ validFrom, weeklyHours, workDays, vacationDaysPerYear, costRate: 0 });
const emp = (over: Partial<EmploymentLike> = {}): EmploymentLike =>
  ({ id: "e", startDate: "2026-01-01", endDate: null, carryoverDays: 0, carryoverYear: null, terms: [t("2026-01-01", 40)], ...over });
const vac = (startDate: string, endDate: string, status = "APPROVED") => ({ startDate, endDate, status, type: "VACATION" });
// September 2026: keine Feiertage in NRW, 22 Arbeitstage Mo–Fr
const S = "2026-09-01", E = "2026-09-30";

describe("Soll je Arbeitsverhältnis", () => {
  it("Konditionswechsel mitten im Monat", () => {
    expect(employmentTargetHours(emp({ terms: [t("2026-01-01", 40), t("2026-09-15", 20)] }), S, E, [])).toBe(128);
  });
  it("Mo–Do-Vertrag", () => {
    expect(employmentTargetHours(emp({ terms: [t("2026-01-01", 32, [1, 2, 3, 4])] }), S, E, [])).toBe(144);
  });
  it("Eintritt und Austritt begrenzen das Soll", () => {
    expect(employmentTargetHours(emp({ startDate: "2026-09-15", terms: [t("2026-09-15", 40)] }), S, E, [])).toBe(96);
    expect(employmentTargetHours(emp({ endDate: "2026-09-10" }), S, E, [])).toBe(64);
  });
  it("Urlaub senkt das Soll", () => {
    expect(employmentTargetHours(emp(), S, E, [vac("2026-09-07", "2026-09-11")])).toBe(136);
  });
  it("Urlaub senkt das Soll auch an vertraglichen Samstagen", () => {
    const saturdays = emp({ terms: [t("2026-01-01", 8, [6])] });
    expect(employmentTargetHours(saturdays, S, E, [])).toBe(32);
    expect(employmentTargetHours(saturdays, S, E, [vac("2026-09-12", "2026-09-12")])).toBe(24);
  });
  it("ohne Wochenstunden kein Soll", () => {
    expect(employmentTargetHours(emp({ terms: [t("2026-01-01", null)] }), S, E, [])).toBeNull();
    expect(personTargetHours([emp({ terms: [t("2026-01-01", null)] }), emp()], S, E, [])).toBe(176);
    expect(personTargetHours([], S, E, [])).toBeNull();
  });
});

describe("Urlaub je Arbeitsverhältnis", () => {
  it("Urlaubsanspruch anteilig und bei Konditionswechsel", () => {
    expect(employmentVacationAllowance(emp(), 2026)).toBe(30);
    expect(employmentVacationAllowance(emp({ startDate: "2026-09-15", terms: [t("2026-09-15", 40)] }), 2026)).toBe(7.5);
    expect(employmentVacationAllowance(emp({ terms: [t("2026-01-01", 40), t("2026-07-01", 32, [1, 2, 3, 4], 24)] }), 2026)).toBe(27);
  });
  it("Urlaubstage nach Arbeitstagen des Vertrags, Krankheit im Urlaub zählt nicht", () => {
    const week = [vac("2026-09-07", "2026-09-11")];
    expect(employmentVacationBalance(emp(), 2026, week).taken).toBe(5);
    expect(employmentVacationBalance(emp({ terms: [t("2026-01-01", 32, [1, 2, 3, 4])] }), 2026, week).taken).toBe(4);
    const sick = { startDate: "2026-09-09", endDate: "2026-09-09", status: "APPROVED", type: "SICK" };
    expect(employmentVacationBalance(emp(), 2026, [...week, sick]).taken).toBe(4);
  });
  it("Resturlaub nur im zugehörigen Jahr", () => {
    const e = emp({ carryoverDays: 3, carryoverYear: 2026 });
    expect(employmentVacationBalance(e, 2026, []).total).toBe(33);
    expect(employmentVacationBalance(e, 2027, []).total).toBe(30);
  });
});
