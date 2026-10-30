"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isValidISO, todayISO } from "@/lib/dates";
import { canEditDate, lockMessage } from "@/lib/lock";
import { can } from "@/lib/permissions";
import { resolveEmployment } from "@/lib/employment";
import { loadEmployments } from "@/lib/people";
import { termsOn } from "@/lib/terms";
import { nowHM, parseHM, requiredBreak } from "@/lib/worktime";
import type { FormState } from "./auth";

function parseHours(v: FormDataEntryValue | null): number | string {
  const hours = Number(String(v ?? "").trim().replace(",", "."));
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return "Stunden müssen zwischen 0 und 24 liegen.";
  if (Math.round(hours * 4) !== hours * 4) return "Bitte in Viertelstunden erfassen (z. B. 1,25 oder 7,5).";
  return hours;
}

/** Arbeitsverhältnis für eine Buchung am Tag – ohne Rückfrage, wenn nur eines besteht. */
async function employmentFor(userId: string, date: string, form: FormData) {
  const emps = (await loadEmployments([userId])).get(userId) ?? [];
  return resolveEmployment(emps, date, String(form.get("employmentId") ?? "") || null);
}

async function checkDayTotal(userId: string, date: string, hours: number, excludeId?: string) {
  const dayTotal = await prisma.timeEntry.aggregate({
    where: { userId, date, ...(excludeId && { id: { not: excludeId } }) },
    _sum: { hours: true },
  });
  return (dayTotal._sum.hours ?? 0) + hours <= 24;
}

export async function addTimeEntry(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const date = String(form.get("date") ?? "");
  const projectId = String(form.get("projectId") ?? "");
  const hours = parseHours(form.get("hours"));
  const note = String(form.get("note") ?? "").trim() || null;

  if (!isValidISO(date)) return { error: "Bitte ein gültiges Datum wählen." };
  if (!canEditDate(date, user.role)) return { error: lockMessage(date) };
  if (typeof hours === "string") return { error: hours };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || !project.active) return { error: "Bitte ein aktives Projekt wählen." };
  const emp = await employmentFor(user.id, date, form);
  if (typeof emp === "string") return { error: emp };
  if (!(await checkDayTotal(user.id, date, hours))) return { error: "An diesem Tag wären es mehr als 24 Stunden." };

  // Kostensatz der am Buchungstag gültigen Konditionen – spätere Änderungen verändern diese Buchung nicht.
  const costRate = termsOn(emp.terms, date)?.costRate ?? 0;
  await prisma.timeEntry.create({
    data: { userId: user.id, employmentId: emp.id, projectId, date, hours, note, costRate },
  });
  revalidatePath("/", "layout");
  return { ok: `${hours.toString().replace(".", ",")} h auf „${project.name}“ gebucht.` };
}

export async function updateTimeEntry(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || (entry.userId !== user.id && !can(user.role, "time.editAll"))) return { error: "Buchung nicht gefunden." };
  if (!canEditDate(entry.date, user.role)) return { error: lockMessage(entry.date) };

  const projectId = String(form.get("projectId") ?? "");
  const hours = parseHours(form.get("hours"));
  const note = String(form.get("note") ?? "").trim() || null;
  if (typeof hours === "string") return { error: hours };
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  // Ein abgeschlossenes Projekt darf bleiben, wenn es schon gebucht war – aber nicht neu gewählt werden.
  if (!project || (!project.active && project.id !== entry.projectId)) return { error: "Bitte ein aktives Projekt wählen." };
  if (!(await checkDayTotal(entry.userId, entry.date, hours, id))) return { error: "An diesem Tag wären es mehr als 24 Stunden." };

  // Der Kostensatz bleibt der zum Buchungszeitpunkt.
  await prisma.timeEntry.update({ where: { id }, data: { projectId, hours, note } });
  revalidatePath("/", "layout");
  return { ok: "Gespeichert." };
}

export async function deleteTimeEntry(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || (entry.userId !== user.id && !can(user.role, "time.editAll"))) return;
  if (!canEditDate(entry.date, user.role)) return;
  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath("/", "layout");
}

export async function saveWorkDay(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const date = String(form.get("date") ?? "");
  const start = String(form.get("start") ?? "").trim();
  const end = String(form.get("end") ?? "").trim();
  const breakMinutes = Number(String(form.get("breakMinutes") ?? "0").trim() || 0);

  if (!isValidISO(date)) return { error: "Ungültiges Datum." };
  if (!canEditDate(date, user.role)) return { error: lockMessage(date) };
  const emp = await employmentFor(user.id, date, form);
  if (typeof emp === "string") return { error: emp };

  if (!start && !end) {
    await prisma.workDay.deleteMany({ where: { employmentId: emp.id, date } });
    revalidatePath("/", "layout");
    return { ok: "Arbeitszeit entfernt." };
  }
  const s = parseHM(start);
  const e = end ? parseHM(end) : null;
  if (s === null) return { error: "Bitte den Beginn als HH:MM angeben." };
  if (end && e === null) return { error: "Bitte das Ende als HH:MM angeben." };
  if (e !== null && e <= s) return { error: "Das Ende muss nach dem Beginn liegen." };
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || (e !== null && breakMinutes >= e - s)) {
    return { error: "Bitte eine gültige Pause in Minuten angeben." };
  }

  const data = { start, end: end || null, breakMinutes };
  await prisma.workDay.upsert({
    where: { employmentId_date: { employmentId: emp.id, date } },
    update: data,
    create: { userId: user.id, employmentId: emp.id, date, ...data },
  });
  revalidatePath("/", "layout");
  return { ok: "Gespeichert." };
}

/**
 * Stempeluhr für heute: "start" setzt den Arbeitsbeginn auf jetzt, "end" den Feierabend.
 * Beim Feierabend wird die gesetzliche Mindestpause eingetragen, falls noch keine erfasst ist.
 */
export async function stampWork(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const kind = String(form.get("kind") ?? "");
  const today = todayISO();
  const now = nowHM();
  const emp = await employmentFor(user.id, today, form);
  if (typeof emp === "string") return { error: emp };
  const existing = await prisma.workDay.findUnique({ where: { employmentId_date: { employmentId: emp.id, date: today } } });

  if (kind === "start") {
    if (existing) return { error: `Arbeitsbeginn ist schon eingetragen (${existing.start}).` };
    await prisma.workDay.create({ data: { userId: user.id, employmentId: emp.id, date: today, start: now, end: null, breakMinutes: 0 } });
    revalidatePath("/", "layout");
    return { ok: `Arbeitsbeginn ${now} gespeichert.` };
  }
  if (kind === "end") {
    if (!existing) return { error: "Bitte zuerst den Arbeitsbeginn eintragen." };
    const s = parseHM(existing.start)!;
    const e = parseHM(now)!;
    if (e <= s) return { error: "Feierabend muss nach dem Arbeitsbeginn liegen." };
    const breakMinutes = Math.max(existing.breakMinutes, requiredBreak(e - s - existing.breakMinutes));
    await prisma.workDay.update({ where: { id: existing.id }, data: { end: now, breakMinutes } });
    revalidatePath("/", "layout");
    return {
      ok: breakMinutes > existing.breakMinutes
        ? `Feierabend ${now} gespeichert. ${breakMinutes} Min. Pause wurden automatisch eingetragen – bitte bei Bedarf anpassen.`
        : `Feierabend ${now} gespeichert.`,
    };
  }
  return { error: "Unbekannte Aktion." };
}
