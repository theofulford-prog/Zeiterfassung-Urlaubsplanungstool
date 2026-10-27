"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { addDays, countWorkdays, isValidISO, todayISO } from "@/lib/dates";
import type { FormState } from "./auth";

/** Krankmeldungen gelten ohne Freigabe, wenn sie höchstens so viele Tage in der Zukunft beginnen. */
const SICK_AUTO_APPROVE_DAYS = 3;

type Parsed = { startDate: string; endDate: string; type: string; note: string | null; halfDay: boolean; days: number };

function parseLeave(form: FormData): Parsed | string {
  const startDate = String(form.get("startDate") ?? "");
  const halfDay = form.get("halfDay") === "on";
  const endDate = halfDay ? startDate : String(form.get("endDate") ?? "") || startDate;
  const type = String(form.get("type") ?? "VACATION");
  const note = String(form.get("note") ?? "").trim() || null;

  if (!isValidISO(startDate) || !isValidISO(endDate)) return "Bitte Start- und Enddatum wählen.";
  if (endDate < startDate) return "Das Enddatum liegt vor dem Startdatum.";
  const year = Number(todayISO().slice(0, 4));
  const y = Number(startDate.slice(0, 4));
  if (y < year - 1 || y > year + 2) return "Bitte ein Datum im Zeitraum Vorjahr bis übernächstes Jahr wählen.";
  if (endDate > addDays(startDate, 366)) return "Ein Eintrag darf höchstens ein Jahr umfassen.";
  if (!["VACATION", "SICK", "OTHER"].includes(type)) return "Unbekannte Art der Abwesenheit.";

  const workdays = countWorkdays(startDate, endDate);
  if (workdays === 0) return "Im gewählten Zeitraum liegen keine Arbeitstage.";
  return { startDate, endDate, type, note, halfDay, days: halfDay ? 0.5 : workdays };
}

/** Überschneidungen: Krankheit darf in genehmigten Urlaub fallen (Urlaubstage werden dann gutgeschrieben). */
async function findConflict(userId: string, p: Parsed) {
  return prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: p.endDate },
      endDate: { gte: p.startDate },
      ...(p.type === "SICK" && { type: { not: "VACATION" } }),
    },
  });
}

export async function requestLeave(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = parseLeave(form);
  if (typeof p === "string") return { error: p };
  if (await findConflict(user.id, p)) return { error: "Für diesen Zeitraum gibt es bereits einen Eintrag." };

  const autoApprove = p.type === "SICK" && p.startDate <= addDays(todayISO(), SICK_AUTO_APPROVE_DAYS);
  await prisma.leaveRequest.create({ data: { userId: user.id, ...p, status: autoApprove ? "APPROVED" : "PENDING" } });
  revalidatePath("/", "layout");
  if (autoApprove) return { ok: "Krankmeldung eingetragen. Gute Besserung!" };
  return { ok: `Antrag über ${String(p.days).replace(".", ",")} Arbeitstag(e) gestellt – wartet auf Freigabe.` };
}

/** GF trägt eine Abwesenheit direkt für eine Person ein (sofort genehmigt). */
export async function createLeaveForUser(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requirePermission("leave.approve");
  const userId = String(form.get("userId") ?? "");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Bitte eine Person wählen." };
  const p = parseLeave(form);
  if (typeof p === "string") return { error: p };
  if (await findConflict(userId, p)) return { error: `${target.name} hat in diesem Zeitraum bereits einen Eintrag.` };
  await prisma.leaveRequest.create({
    data: { userId, ...p, status: "APPROVED", decidedById: admin.id, decidedAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: `Für ${target.name} eingetragen.` };
}

export async function cancelLeave(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const req = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!req) return;
  const own = req.userId === user.id && req.status === "PENDING";
  if (!own && !can(user.role, "leave.approve")) return;
  await prisma.leaveRequest.delete({ where: { id } });
  revalidatePath("/", "layout");
}

export async function decideLeave(form: FormData) {
  const admin = await requirePermission("leave.approve");
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  if (!["APPROVED", "REJECTED"].includes(decision)) return;
  // Nur offene Anträge können entschieden werden.
  await prisma.leaveRequest.updateMany({
    where: { id, status: "PENDING" },
    data: { status: decision, decidedById: admin.id, decidedAt: new Date() },
  });
  revalidatePath("/", "layout");
}
