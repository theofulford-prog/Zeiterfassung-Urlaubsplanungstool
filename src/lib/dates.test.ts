import { describe, expect, it } from "vitest";
import { countWorkdays, countWorkdaysFor, isoWeekday, isWorkdayFor } from "./dates";

describe("countWorkdays", () => {
  it("zählt Weihnachten in NRW nicht mit", () => {
    expect(countWorkdays("2026-12-21", "2026-12-27")).toBe(4);
  });
});

describe("Arbeitstage je Vertrag", () => {
  it("Wochentag nach ISO", () => {
    expect(isoWeekday("2026-11-02")).toBe(1);
    expect(isoWeekday("2026-11-08")).toBe(7);
  });
  it("Mo–Do-Woche zählt vier Tage", () => {
    expect(countWorkdaysFor("2026-11-02", "2026-11-08", [1, 2, 3, 4])).toBe(4);
  });
  it("Feiertag fällt auch bei eigenem Muster weg", () => {
    expect(countWorkdaysFor("2026-12-21", "2026-12-27", [1, 2, 3, 4, 5])).toBe(4);
    expect(countWorkdaysFor("2026-12-21", "2026-12-27", [5])).toBe(0);
  });
  it("ohne Arbeitstage nie ein Arbeitstag", () => {
    expect(countWorkdaysFor("2026-11-02", "2026-11-08", [])).toBe(0);
    expect(isWorkdayFor("2026-11-02", [])).toBe(false);
  });
});
