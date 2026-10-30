"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { diffChanges } from "@/lib/audit-diff";
import type { FormState } from "./auth";

export async function saveCompany(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requirePermission("companies.manage");
  const id = String(form.get("id") ?? "") || null;
  const name = String(form.get("name") ?? "").trim();
  const shortName = String(form.get("shortName") ?? "").trim() || null;
  const active = form.get("active") !== "off";
  if (!name) return { error: "Bitte einen Namen angeben." };

  const existing = id ? await prisma.company.findUnique({ where: { id } }) : null;
  if (id && !existing) return { error: "Gesellschaft nicht gefunden." };
  const data = { name, shortName, active };
  try {
    await prisma.$transaction(async (tx) => {
      const company = existing
        ? await tx.company.update({ where: { id: existing.id }, data })
        : await tx.company.create({ data });
      await audit({
        actorId: actor.id,
        action: existing ? "company.update" : "company.create",
        entityType: "Company",
        entityId: company.id,
        changes: diffChanges(existing, data),
      }, tx);
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { error: "Diese Gesellschaft gibt es schon." };
    throw e;
  }
  revalidatePath("/gesellschaften");
  return { ok: existing ? "Gespeichert." : `„${name}“ angelegt.` };
}
