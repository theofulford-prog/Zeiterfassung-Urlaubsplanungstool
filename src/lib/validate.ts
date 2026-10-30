// Formale Prüfung von Lohndaten in der Personalakte.

export function normalizeIban(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}

/** Prüfziffer nach ISO 13616 (mod 97). */
export function isValidIban(s: string): boolean {
  const iban = normalizeIban(s);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}

/** Steuerliche Identifikationsnummer: 11 Ziffern, erste Ziffer nicht 0. */
export function isValidTaxId(s: string): boolean {
  return /^[1-9]\d{10}$/.test(s.replace(/\s+/g, ""));
}

/** Sozialversicherungsnummer: 8 Ziffern, ein Buchstabe, 3 Ziffern. */
export function isValidSocialSecurityNumber(s: string): boolean {
  return /^\d{8}[A-Z]\d{3}$/.test(s.replace(/\s+/g, "").toUpperCase());
}
