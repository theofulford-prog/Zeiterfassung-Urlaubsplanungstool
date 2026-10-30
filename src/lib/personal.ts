import "server-only";
import type { PersonalRecord } from "@prisma/client";
import { decryptField, maskValue } from "./crypto";

/** Maskierte Anzeige der verschlüsselten Lohndaten ("•••• 3000"); null = nicht hinterlegt. */
export function maskedPersonal(record: PersonalRecord | null) {
  const mask = (enc: string | null | undefined) => {
    if (!enc) return null;
    try {
      return maskValue(decryptField(enc));
    } catch {
      return "verschlüsselt hinterlegt";
    }
  };
  return {
    taxId: mask(record?.taxIdEnc),
    socialSecurity: mask(record?.socialSecurityEnc),
    iban: mask(record?.ibanEnc),
  };
}
