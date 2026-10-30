import { describe, expect, it } from "vitest";
import { hasAccessOn, resolveEmployment } from "./employment";

const a = { id: "a", startDate: "2026-01-01", endDate: "2026-06-30" };
const b = { id: "b", startDate: "2026-01-01", endDate: null };
const later = { id: "c", startDate: "2026-12-01", endDate: null };

describe("Arbeitsverhältnis für eine Buchung", () => {
  it("bucht ohne Rückfrage auf das einzige bestehende Arbeitsverhältnis", () => {
    expect(resolveEmployment([a, b], "2026-10-01")).toBe(b);
  });
  it("fragt bei zwei bestehenden nach", () => {
    expect(resolveEmployment([a, b], "2026-03-01")).toBe("Bitte das Arbeitsverhältnis wählen.");
    expect(resolveEmployment([a, b], "2026-03-01", "a")).toBe(a);
  });
  it("lehnt beendete oder fehlende Arbeitsverhältnisse ab", () => {
    expect(resolveEmployment([a, b], "2026-10-01", "a")).toBe("Dieses Arbeitsverhältnis besteht am 01.10.2026 nicht.");
    expect(resolveEmployment([a], "2026-10-01")).toBe("Am 01.10.2026 besteht kein Arbeitsverhältnis.");
    expect(resolveEmployment([later], "2026-11-15")).toBe("Am 15.11.2026 besteht kein Arbeitsverhältnis.");
  });
});

describe("Zugang", () => {
  it("endet erst mit dem letzten Arbeitsverhältnis", () => {
    const u = { accessWithoutEmployment: false };
    expect(hasAccessOn(u, [a], "2026-06-30")).toBe(true);
    expect(hasAccessOn(u, [a], "2026-07-01")).toBe(false);
    expect(hasAccessOn(u, [a, b], "2026-10-01")).toBe(true);
    expect(hasAccessOn(u, [later], "2026-11-15")).toBe(true);
    expect(hasAccessOn(u, [], "2026-11-15")).toBe(false);
    expect(hasAccessOn({ accessWithoutEmployment: true }, [], "2026-11-15")).toBe(true);
  });
});
