import { describe, expect, it } from "vitest";
import { termSegments, termsOn } from "./terms";

const t1 = { validFrom: "2026-01-01", id: "a" };
const t2 = { validFrom: "2026-09-15", id: "b" };

describe("Konditionen-Historie", () => {
  it("termsOn wählt die zum Tag gültigen Konditionen", () => {
    expect(termsOn([t2, t1], "2025-12-31")).toBeNull();
    expect(termsOn([t2, t1], "2026-09-14")?.id).toBe("a");
    expect(termsOn([t2, t1], "2026-09-15")?.id).toBe("b");
  });
  it("termSegments teilt einen Monat am Wechsel", () => {
    expect(termSegments([t2, t1], "2026-09-01", "2026-09-30").map((s) => [s.from, s.to, s.terms.id])).toEqual([
      ["2026-09-01", "2026-09-14", "a"],
      ["2026-09-15", "2026-09-30", "b"],
    ]);
  });
  it("termSegments beginnt frühestens mit der ersten Kondition", () => {
    expect(termSegments([t2], "2026-09-01", "2026-09-30").map((s) => s.from)).toEqual(["2026-09-15"]);
    expect(termSegments([], "2026-09-01", "2026-09-30")).toEqual([]);
  });
});
