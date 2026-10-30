// Verschlüsselung besonders schützenswerter Personalakten-Felder (Steuer-ID, SV-Nummer, IBAN) mit AES-256-GCM.
// Der Schlüssel liegt nicht in der Datenbank, sondern in der Umgebungsvariable PII_ENCRYPTION_KEY (base64, 32 Byte).
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

function key(): Buffer {
  const raw = process.env.PII_ENCRYPTION_KEY;
  const k = raw ? Buffer.from(raw, "base64") : null;
  if (!k || k.length !== 32) throw new Error("PII_ENCRYPTION_KEY fehlt oder ist ungültig");
  return k;
}

/** Ergebnis: "v1:<iv>:<tag>:<ciphertext>" (jeweils base64). Jeder Aufruf nutzt einen neuen Zufalls-IV. */
export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

/** Wirft bei falschem Schlüssel, unbekanntem Format oder manipulierten Daten. */
export function decryptField(enc: string): string {
  const [version, iv, tag, ct] = enc.split(":");
  if (version !== VERSION || !iv || !tag || ct === undefined) throw new Error("Unbekanntes Format verschlüsselter Daten");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
}

/** Anzeige ohne Klartext, z. B. "•••• 3000". */
export function maskValue(value: string): string {
  return `•••• ${value.slice(-4)}`;
}
