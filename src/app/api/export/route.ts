import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { addDays, formatDate, isValidISO, monthEnd, monthStart, todayISO } from "@/lib/dates";
import { LEAVE_STATUS, LEAVE_TYPES } from "@/lib/format";
import { can } from "@/lib/permissions";
import { hasAccessOn } from "@/lib/employment";
import { loadPermissions } from "@/lib/rbac";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { netMinutes } from "@/lib/worktime";

// Excel (deutsch) erwartet Semikolon, Dezimalkomma und eine UTF-8-BOM für Umlaute.
const num = (n: number) => n.toFixed(2).replace(".", ",");
const cell = (v: string | number | null | undefined) => {
  const s = typeof v === "number" ? num(v) : (v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: (string | number | null | undefined)[][]) => "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");

export async function GET(req: NextRequest) {
  await loadPermissions();
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const me = session && (await prisma.user.findUnique({ where: { id: session.userId } }));
  const myEmployments = me ? await prisma.employment.findMany({ where: { userId: me.id }, select: { id: true, startDate: true, endDate: true } }) : [];
  if (!me || !me.active || me.sessionVersion !== (session.v ?? 0) || !hasAccessOn(me, myEmployments, todayISO())) {
    return new Response("Nicht angemeldet", { status: 401 });
  }
  if (me.mustChangePassword) return new Response("Bitte zuerst das Passwort ändern", { status: 403 });
  // Team-Export nur mit Exportrecht; sonst nur eigene Daten. Kostenspalten nur mit Kostenrecht.
  const isAdmin = can(me.role, "export.data");
  const showCosts = can(me.role, "costs.view");

  const q = req.nextUrl.searchParams;
  const today = todayISO();
  const von = isValidISO(q.get("von")) ? q.get("von")! : monthStart(today);
  const bis = isValidISO(q.get("bis")) ? q.get("bis")! : monthEnd(today);
  // Mitarbeitende dürfen nur ihre eigenen Daten exportieren.
  const person = isAdmin ? q.get("person") || undefined : me.id;
  const projekt = isAdmin ? q.get("projekt") || undefined : undefined;
  const maxDays = person || projekt ? 3660 : 731;
  if (bis < von || bis > addDays(von, maxDays)) return new Response("Zeitraum ungültig", { status: 400 });
  const typ = q.get("typ") ?? "zeiten";

  let body: string;
  let name: string;
  if (typ === "arbeitszeit") {
    const rows = await prisma.workDay.findMany({
      where: { date: { gte: von, lte: bis }, ...(person && { userId: person }) },
      include: { user: { select: { name: true } }, employment: { include: { company: { select: { name: true } } } } },
      orderBy: [{ date: "asc" }],
    });
    body = csv([
      ["Datum", "Person", "Gesellschaft", "Beginn", "Ende", "Pause (Min.)", "Netto (Std.)"],
      ...rows.map((w) => [
        formatDate(w.date), w.user.name, w.employment?.company.name, w.start, w.end ?? "läuft", String(w.breakMinutes), netMinutes(w) / 60,
      ]),
    ]);
    name = "arbeitszeiten";
  } else if (typ === "abwesenheiten") {
    if (!isAdmin || !can(me.role, "absence.reasons")) return new Response("Keine Berechtigung", { status: 403 });
    const rows = await prisma.leaveRequest.findMany({
      where: { startDate: { lte: bis }, endDate: { gte: von }, ...(person && { userId: person }) },
      include: { user: { select: { name: true } } },
      orderBy: { startDate: "asc" },
    });
    body = csv([
      ["Person", "Art", "Von", "Bis", "Arbeitstage", "Status", "Notiz"],
      ...rows.map((l) => [l.user.name, LEAVE_TYPES[l.type], formatDate(l.startDate), formatDate(l.endDate), l.days, LEAVE_STATUS[l.status], l.note]),
    ]);
    name = "abwesenheiten";
  } else {
    const rows = await prisma.timeEntry.findMany({
      where: { date: { gte: von, lte: bis }, ...(person && { userId: person }), ...(projekt && { projectId: projekt }) },
      include: {
        user: { select: { name: true } },
        project: { select: { name: true, category: true } },
        employment: { include: { company: { select: { name: true } } } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    const head = ["Datum", "Person", "Gesellschaft", "Projekt", "Kategorie", "Stunden", ...(showCosts ? ["Kostensatz €/h", "Kosten €"] : []), "Notiz"];
    body = csv([
      head,
      ...rows.map((e) => [
        formatDate(e.date), e.user.name, e.employment?.company.name, e.project.name, e.project.category, e.hours,
        ...(showCosts ? [e.costRate, e.hours * e.costRate] : []), e.note,
      ]),
    ]);
    name = "zeiten";
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="teamzeit-${name}-${von}-bis-${bis}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
