import { describe, expect, it } from "vitest";
import { countWorkdays } from "./dates";

describe("countWorkdays", () => {
  it("zählt Weihnachten in NRW nicht mit", () => {
    expect(countWorkdays("2026-12-21", "2026-12-27")).toBe(4);
  });
});
