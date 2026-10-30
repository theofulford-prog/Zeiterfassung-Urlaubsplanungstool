import { describe, expect, it } from "vitest";
import { loginBlockReason } from "./login";

const emp = [{ id: "a", startDate: "2026-01-01", endDate: null }];

describe("Anmeldung gesperrt?", () => {
  it("ohne Passwort kein Login", () => {
    expect(loginBlockReason({ passwordHash: null, active: true, accessWithoutEmployment: false }, emp, "2026-10-30"))
      .toBe("Für diese Person ist kein Zugang eingerichtet.");
  });
  it("beendet oder inaktiv", () => {
    expect(loginBlockReason({ passwordHash: "x", active: true, accessWithoutEmployment: false }, [], "2026-10-30"))
      .toBe("Dieser Zugang ist nicht mehr aktiv.");
    expect(loginBlockReason({ passwordHash: "x", active: false, accessWithoutEmployment: true }, [], "2026-10-30"))
      .toBe("Dieser Zugang ist nicht mehr aktiv.");
  });
  it("ohne Arbeitsverhältnis mit Kennzeichen erlaubt", () => {
    expect(loginBlockReason({ passwordHash: "x", active: true, accessWithoutEmployment: true }, [], "2026-10-30")).toBeNull();
  });
});
