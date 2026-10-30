import { beforeEach, describe, expect, it } from "vitest";
import { decryptField, encryptField, maskValue } from "./crypto";

describe("Verschlüsselung der Lohndaten", () => {
  beforeEach(() => {
    process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });
  it("verschlüsselt umkehrbar und jedes Mal anders", () => {
    const a = encryptField("DE89370400440532013000");
    expect(a.startsWith("v1:")).toBe(true);
    expect(a).not.toBe(encryptField("DE89370400440532013000"));
    expect(decryptField(a)).toBe("DE89370400440532013000");
  });
  it("erkennt Manipulation", () => {
    const [v, iv, tag] = encryptField("x").split(":");
    expect(() => decryptField([v, iv, tag, Buffer.from("y").toString("base64")].join(":"))).toThrow();
  });
  it("speichert ohne Schlüssel nie Klartext", () => {
    delete process.env.PII_ENCRYPTION_KEY;
    expect(() => encryptField("x")).toThrow("PII_ENCRYPTION_KEY fehlt oder ist ungültig");
    process.env.PII_ENCRYPTION_KEY = "zu-kurz";
    expect(() => encryptField("x")).toThrow("PII_ENCRYPTION_KEY fehlt oder ist ungültig");
  });
  it("maskiert", () => {
    expect(maskValue("DE89370400440532013000")).toBe("•••• 3000");
  });
});
