import { describe, expect, it } from "vitest";
import { diffChanges } from "./audit-diff";

describe("Änderungen fürs Protokoll", () => {
  it("nur geänderte Felder", () => {
    expect(diffChanges({ a: 1, b: "x" }, { a: 1, b: "y" })).toEqual({ b: { from: "x", to: "y" } });
    expect(diffChanges({ workDays: [1, 2] }, { workDays: [1, 2] })).toEqual({});
  });
  it("sensible Felder ohne Werte", () => {
    expect(diffChanges({ ibanEnc: "v1:a" }, { ibanEnc: "v1:b" })).toEqual({ ibanEnc: { changed: true } });
  });
  it("Neuanlage und ignorierte Felder", () => {
    expect(diffChanges(null, { name: "A", note: null, updatedAt: new Date() })).toEqual({ name: { from: null, to: "A" } });
  });
});
