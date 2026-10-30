import { describe, expect, it } from "vitest";
import { visibleChanges } from "./audit-view";

const changes = {
  costRate: { from: null, to: 45 },
  payAmount: { from: 3000, to: 3200 },
  weeklyHours: { from: 40, to: 38 },
  ibanEnc: { changed: true as const },
};

describe("Protokoll je nach Betrachter", () => {
  it("Kostensatz nur mit Kostenrecht", () => {
    expect(visibleChanges(changes, { showCosts: false, showPay: true }).costRate).toEqual({ changed: true });
    expect(visibleChanges(changes, { showCosts: true, showPay: true }).costRate).toEqual({ from: null, to: 45 });
  });
  it("Vergütung nur mit Personal-/Kostenrecht oder für sich selbst", () => {
    expect(visibleChanges(changes, { showCosts: false, showPay: false }).payAmount).toEqual({ changed: true });
    expect(visibleChanges(changes, { showCosts: false, showPay: true }).payAmount).toEqual({ from: 3000, to: 3200 });
  });
  it("übrige Felder unverändert", () => {
    const v = visibleChanges(changes, { showCosts: false, showPay: false });
    expect(v.weeklyHours).toEqual({ from: 40, to: 38 });
    expect(v.ibanEnc).toEqual({ changed: true });
  });
});
