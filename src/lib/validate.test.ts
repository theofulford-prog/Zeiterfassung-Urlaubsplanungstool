import { describe, expect, it } from "vitest";
import { isValidIban, isValidSocialSecurityNumber, isValidTaxId, normalizeIban } from "./validate";

describe("Prüfung der Lohndaten", () => {
  it("IBAN", () => {
    expect(normalizeIban(" de89 3704 0044 0532 0130 00 ")).toBe("DE89370400440532013000");
    expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(isValidIban("DE89370400440532013001")).toBe(false);
  });
  it("Steuer-ID und SV-Nummer", () => {
    expect(isValidTaxId("12345678901")).toBe(true);
    expect(isValidTaxId("02345678901")).toBe(false);
    expect(isValidSocialSecurityNumber("12345678a123")).toBe(true);
    expect(isValidSocialSecurityNumber("12345678123")).toBe(false);
  });
});
