"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isValidISO } from "@/lib/dates";
import { canEditDate, lockMessage } from "@/lib/lock";
import { can } from "@/lib/permissions";
import { parseHM } from "@/lib/worktime";
import type { FormState } from "./auth";

function parseHours(v: FormDataEntryValue | null): number | string {
  const hours = Number(String(v ?? "").trim().replace(",", "."));
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return "Stunden müssen zwischen 0 und 24 liegen.";
  if (Math.round(hours * 4) !== hours * 4) return "Bitte in Viertelstunden erfassen (z. B. 1,25 oder 7,5).";
  return hours;
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
  if (!(await checkDayTotal(user.id, date, hours))) return { error: "An diesem Tag wären es mehr als 24 Stunden." };

  await prisma.timeEntry.create({
    data: { userId: user.id, projectId, date, hours, note, costRate: user.hourlyCost },
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

  if (!start && !end) {
    await prisma.workDay.deleteMany({ where: { userId: user.id, date } });
    revalidatePath("/", "layout");
    return { ok: "Arbeitszeit entfernt." };
  }
  const s = parseHM(start);
  const e = parseHM(end);
  if (s === null || e === null) return { error: "Bitte Beginn und Ende als HH:MM angeben." };
  if (e <= s) return { error: "Das Ende muss nach dem Beginn liegen." };
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes >= e - s) return { error: "Bitte eine gültige Pause in Minuten angeben." };

  await prisma.workDay.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: { start, end, breakMinutes },
    create: { userId: user.id, date, start, end, breakMinutes },
  });
  revalidatePath("/", "layout");
  return { ok: "Gespeichert." };
}
