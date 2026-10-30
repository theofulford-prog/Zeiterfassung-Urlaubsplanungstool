"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { diffChanges } from "@/lib/audit-diff";
import { decryptField, encryptField } from "@/lib/crypto";
import { isValidISO } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { isValidIban, isValidSocialSecurityNumber, isValidTaxId, normalizeIban } from "@/lib/validate";
import type { FormState } from "./auth";

/** Lohndaten, die nur verschlüsselt gespeichert und nie mit Werten protokolliert werden. */
const SENSITIVE = {
  taxId: {
    column: "taxIdEnc",
    normalize: (s: string) => s.replace(/\s+/g, ""),
    valid: isValidTaxId,
    error: "Bitte eine gültige Steuer-ID (11 Ziffern) angeben.",
  },
  socialSecurity: {
    column: "socialSecurityEnc",
    normalize: (s: string) => s.replace(/\s+/g, "").toUpperCase(),
    valid: isValidSocialSecurityNumber,
    error: "Bitte eine gültige Sozialversicherungsnummer angeben.",
  },
  iban: { column: "ibanEnc", normalize: normalizeIban, valid: isValidIban, error: "Bitte eine gültige IBAN angeben." },
} as const;
export type SensitiveField = keyof typeof SENSITIVE;

const PLAIN_FIELDS = [
  "birthDate", "street", "postalCode", "city", "phone", "privateEmail",
  "emergencyName", "emergencyPhone", "emergencyRelation", "healthInsurance", "accountHolder",
] as const;

export async function savePersonalRecord(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requirePermission("personnel.edit");
  const userId = String(form.get("userId") ?? "");
  const person = await prisma.user.findUnique({ where: { id: userId }, include: { personalRecord: true } });
  if (!person) return { error: "Person nicht gefunden." };

  const data: Record<string, string | null> = {};
  for (const f of PLAIN_FIELDS) data[f] = String(form.get(f) ?? "").trim() || null;
  if (data.birthDate && !isValidISO(data.birthDate)) return { error: "Bitte ein gültiges Geburtsdatum angeben." };
  if (data.privateEmail && !/^\S+@\S+\.\S+$/.test(data.privateEmail)) return { error: "Bitte eine gültige private E-Mail angeben." };

  for (const [field, spec] of Object.entries(SENSITIVE)) {
    if (form.get(`${field}Remove`) === "on") {
      data[spec.column] = null;
      continue;
    }
    const input = spec.normalize(String(form.get(field) ?? ""));
    if (!input) continue; // leer = unverändert
    if (!spec.valid(input)) return { error: spec.error };
    try {
      data[spec.column] = encryptField(input);
    } catch {
      return { error: "Lohndaten können gerade nicht gespeichert werden (Schlüssel fehlt). Bitte den Admin informieren." };
    }
  }

  const before = person.personalRecord;
  await prisma.$transaction(async (tx) => {
    await tx.personalRecord.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    await audit({
      actorId: actor.id, action: "personal.update", entityType: "PersonalRecord", entityId: userId,
      subjectUserId: userId, changes: diffChanges(before, data),
    }, tx);
  });
  revalidatePath(`/mitarbeitende/${userId}`);
  return { ok: "Personalakte gespeichert." };
}

/**
 * Klartext eines verschlüsselten Feldes anzeigen – für die Person selbst oder mit Recht „personnel.view“.
 * Wer fremde Lohndaten ansieht, wird protokolliert (ohne Wert).
 */
export async function revealPersonalField(
  _: { value?: string; error?: string } | undefined,
  form: FormData,
): Promise<{ value?: string; error?: string }> {
  const actor = await requireUser();
  const userId = String(form.get("userId") ?? "");
  const field = String(form.get("field") ?? "") as SensitiveField;
  if (!(field in SENSITIVE)) return { error: "Unbekanntes Feld." };
  const own = actor.id === userId;
  if (!own && !can(actor.role, "personnel.view")) return { error: "Keine Berechtigung." };

  const record = await prisma.personalRecord.findUnique({ where: { userId } });
  const enc = record?.[SENSITIVE[field].column] ?? null;
  if (!enc) return { error: "Nicht hinterlegt." };
  let value: string;
  try {
    value = decryptField(enc);
  } catch {
    return { error: "Konnte nicht entschlüsselt werden." };
  }
  if (!own) {
    await audit({
      actorId: actor.id, action: "personal.read", entityType: "PersonalRecord", entityId: userId,
      subjectUserId: userId, changes: { [SENSITIVE[field].column]: { changed: true } },
    });
  }
  return { value };
}
