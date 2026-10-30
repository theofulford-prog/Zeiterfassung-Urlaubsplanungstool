"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { diffChanges } from "@/lib/audit-diff";
import { addDays, isValidISO } from "@/lib/dates";
import { CONTRACT_TYPES } from "@/lib/employment";
import { endAccessIfNoEmployment } from "@/lib/exits";
import { parseTermsForm } from "@/lib/terms-form";
import type { FormState } from "./auth";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;

type EmploymentInput = {
  companyId: string;
  contractType: string;
  jobTitle: string | null;
  personnelNumber: string | null;
  startDate: string;
  endDate: string | null;
  probationEndDate: string | null;
  fixedTermEndDate: string | null;
  carryoverDays: number;
  carryoverYear: number | null;
};

function parseEmployment(form: FormData): EmploymentInput | string {
  const companyId = String(form.get("companyId") ?? "");
  const contractType = String(form.get("contractType") ?? "");
  const startDate = String(form.get("startDate") ?? "").trim();
  const endDate = text(form, "endDate");
  const probationEndDate = text(form, "probationEndDate");
  const fixedTermEndDate = text(form, "fixedTermEndDate");
  const carryoverDays = Number(String(form.get("carryoverDays") ?? "").trim().replace(",", ".") || 0);
  const carryoverYearRaw = String(form.get("carryoverYear") ?? "").trim();
  const carryoverYear = carryoverYearRaw ? Number(carryoverYearRaw) : null;

  if (!companyId) return "Bitte eine Gesellschaft wählen.";
  if (!(contractType in CONTRACT_TYPES)) return "Bitte eine Vertragsart wählen.";
  if (!isValidISO(startDate)) return "Bitte ein gültiges Eintrittsdatum angeben.";
  for (const d of [endDate, probationEndDate, fixedTermEndDate]) if (d && !isValidISO(d)) return "Bitte gültige Daten angeben.";
  if (endDate && endDate < startDate) return "Der letzte Arbeitstag liegt vor dem Eintritt.";
  if (!Number.isFinite(carryoverDays) || carryoverDays < 0 || Math.round(carryoverDays * 2) !== carryoverDays * 2) {
    return "Resturlaub bitte in halben Tagen angeben.";
  }
  if (carryoverDays > 0 && (carryoverYear === null || !Number.isInteger(carryoverYear) || carryoverYear < 2000 || carryoverYear > 2100)) {
    return "Bitte ein gültiges Jahr für den Resturlaub angeben.";
  }
  return {
    companyId, contractType, jobTitle: text(form, "jobTitle"), personnelNumber: text(form, "personnelNumber"),
    startDate, endDate, probationEndDate, fixedTermEndDate, carryoverDays, carryoverYear: carryoverDays > 0 ? carryoverYear : null,
  };
}

/** Zwei Zeiträume überschneiden sich (offenes Ende = unbegrenzt). */
const overlaps = (a: { startDate: string; endDate: string | null }, b: { startDate: string; endDate: string | null }) =>
  a.startDate <= (b.endDate ?? "9999-12-31") && b.startDate <= (a.endDate ?? "9999-12-31");

/** Arbeitsverhältnis anlegen (inkl. erster Konditionen ab Eintritt) oder bearbeiten bzw. beenden. */
export async function saveEmployment(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requirePermission("personnel.edit");
  const id = String(form.get("id") ?? "") || null;
  const existing = id ? await prisma.employment.findUnique({ where: { id } }) : null;
  if (id && !existing) return { error: "Arbeitsverhältnis nicht gefunden." };
  const userId = existing?.userId ?? String(form.get("userId") ?? "");
  const person = await prisma.user.findUnique({ where: { id: userId } });
  if (!person) return { error: "Person nicht gefunden." };

  const input = parseEmployment(form);
  if (typeof input === "string") return { error: input };
  const company = await prisma.company.findUnique({ where: { id: input.companyId } });
  if (!company) return { error: "Bitte eine Gesellschaft wählen." };
  if (!company.active && company.id !== existing?.companyId) return { error: "Diese Gesellschaft ist inaktiv." };

  const siblings = await prisma.employment.findMany({ where: { userId, companyId: input.companyId, id: { not: existing?.id ?? "" } } });
  if (siblings.some((s) => overlaps(s, input))) {
    return { error: "Bei dieser Gesellschaft besteht in diesem Zeitraum schon ein Arbeitsverhältnis." };
  }

  try {
    if (existing) {
      const firstTerms = await prisma.employmentTerms.findFirst({ where: { employmentId: existing.id }, orderBy: { validFrom: "asc" } });
      if (firstTerms && firstTerms.validFrom < input.startDate) {
        return { error: "Es gibt Konditionen vor dem neuen Eintrittsdatum. Bitte zuerst die Konditionen anpassen." };
      }
      await prisma.$transaction(async (tx) => {
        await tx.employment.update({ where: { id: existing.id }, data: input });
        await audit({
          actorId: actor.id, action: "employment.update", entityType: "Employment", entityId: existing.id,
          subjectUserId: userId, changes: diffChanges(existing, input),
        }, tx);
      });
    } else {
      form.set("validFrom", input.startDate);
      const terms = parseTermsForm(form);
      if (typeof terms === "string") return { error: terms };
      await prisma.$transaction(async (tx) => {
        const emp = await tx.employment.create({ data: { ...input, userId } });
        const t = await tx.employmentTerms.create({ data: { ...terms, employmentId: emp.id, createdById: actor.id } });
        await audit({
          actorId: actor.id, action: "employment.create", entityType: "Employment", entityId: emp.id,
          subjectUserId: userId, changes: diffChanges(null, input),
        }, tx);
        await audit({
          actorId: actor.id, action: "terms.create", entityType: "EmploymentTerms", entityId: t.id,
          subjectUserId: userId, changes: diffChanges(null, terms),
        }, tx);
      });
    }
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { error: "Diese Personalnummer ist bei der Gesellschaft schon vergeben." };
    throw e;
  }
  if (input.endDate) await endAccessIfNoEmployment(userId);
  revalidatePath("/", "layout");
  return { ok: existing ? "Gespeichert." : `Arbeitsverhältnis bei ${company.name} angelegt.` };
}

/** Neue Konditionen ab einem Stichtag. Bisher ohne Kostensatz gebuchte Stunden im Gültigkeitszeitraum werden nachbewertet. */
export async function addTerms(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requirePermission("personnel.edit");
  const employmentId = String(form.get("employmentId") ?? "");
  const emp = await prisma.employment.findUnique({ where: { id: employmentId }, include: { terms: true } });
  if (!emp) return { error: "Arbeitsverhältnis nicht gefunden." };
  const terms = parseTermsForm(form);
  if (typeof terms === "string") return { error: terms };
  if (terms.validFrom < emp.startDate) return { error: "Konditionen können frühestens ab Eintritt gelten." };
  if (emp.terms.some((t) => t.validFrom === terms.validFrom)) return { error: "Für dieses Datum gibt es schon Konditionen." };

  const next = emp.terms.map((t) => t.validFrom).filter((d) => d > terms.validFrom).sort()[0];
  await prisma.$transaction(async (tx) => {
    const t = await tx.employmentTerms.create({ data: { ...terms, employmentId, createdById: actor.id } });
    if (terms.costRate > 0) {
      await tx.timeEntry.updateMany({
        where: { employmentId, costRate: 0, date: { gte: terms.validFrom, ...(next && { lte: addDays(next, -1) }) } },
        data: { costRate: terms.costRate },
      });
    }
    await audit({
      actorId: actor.id, action: "terms.create", entityType: "EmploymentTerms", entityId: t.id,
      subjectUserId: emp.userId, changes: diffChanges(null, terms),
    }, tx);
  });
  revalidatePath("/", "layout");
  return { ok: "Neue Konditionen gespeichert." };
}

/** Nur die jüngsten Konditionen lassen sich entfernen, und nie die einzigen. */
export async function deleteTerms(form: FormData): Promise<void> {
  const actor = await requirePermission("personnel.edit");
  const id = String(form.get("id") ?? "");
  const t = await prisma.employmentTerms.findUnique({ where: { id }, include: { employment: { include: { terms: true } } } });
  if (!t) return;
  const all = t.employment.terms.map((x) => x.validFrom).sort();
  if (all.length < 2 || all[all.length - 1] !== t.validFrom) return;
  await prisma.$transaction(async (tx) => {
    await tx.employmentTerms.delete({ where: { id } });
    await audit({
      actorId: actor.id, action: "terms.delete", entityType: "EmploymentTerms", entityId: id,
      subjectUserId: t.employment.userId, changes: { validFrom: { from: t.validFrom, to: null } },
    }, tx);
  });
  revalidatePath("/", "layout");
}
