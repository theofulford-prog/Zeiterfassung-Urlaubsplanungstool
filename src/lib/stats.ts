import { countWorkdays, daysInRange, isWorkday } from "./dates";

type LeaveLike = { startDate: string; endDate: string; status: string; type: string; halfDay?: boolean };

const weight = (l: LeaveLike) => (l.halfDay ? 0.5 : 1);

function clip(l: LeaveLike, from: string, to: string): [string, string] | null {
  const s = l.startDate > from ? l.startDate : from;
  const e = l.endDate < to ? l.endDate : to;
  return e < s ? null : [s, e];
}

/** Arbeitstage einer Abwesenheit, die in [from, to] fallen (halber Tag = 0,5). */
export function leaveWorkdaysIn(l: LeaveLike, from: string, to: string): number {
  const r = clip(l, from, to);
  return r ? countWorkdays(r[0], r[1]) * weight(l) : 0;
}

/** Abwesende Arbeitstage im Zeitraum als Map Datum → Anteil (überlappende Einträge zählen nur einmal). */
function absentDays(leaves: LeaveLike[], from: string, to: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of leaves) {
    if (l.status !== "APPROVED") continue;
    const r = clip(l, from, to);
    if (!r) continue;
    for (const d of daysInRange(r[0], r[1])) {
      if (isWorkday(d)) map.set(d, Math.max(map.get(d) ?? 0, weight(l)));
    }
  }
  return map;
}

/** Soll-Stunden im Zeitraum: Arbeitstage abzüglich genehmigter Abwesenheiten, anteilig nach Wochenstunden. */
export function targetHours(weeklyHours: number, from: string, to: string, leaves: LeaveLike[]): number {
  if (to < from) return 0;
  const absent = [...absentDays(leaves, from, to).values()].reduce((s, v) => s + v, 0);
  return Math.max(0, (countWorkdays(from, to) - absent) * (weeklyHours / 5));
}

/**
 * Urlaubskonto für ein Kalenderjahr. Krankheitstage während genehmigten Urlaubs
 * werden nicht als Urlaub gezählt (§ 9 BUrlG).
 */
export function vacationBalance(allowance: number, year: number, leaves: LeaveLike[], carryover = 0) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const sick = new Set(
    leaves.filter((l) => l.type === "SICK" && l.status === "APPROVED")
      .flatMap((l) => { const r = clip(l, from, to); return r ? daysInRange(r[0], r[1]) : []; }),
  );
  const count = (status: string) =>
    leaves
      .filter((l) => l.type === "VACATION" && l.status === status)
      .reduce((sum, l) => {
        const r = clip(l, from, to);
        if (!r) return sum;
        return sum + daysInRange(r[0], r[1]).filter((d) => isWorkday(d) && !sick.has(d)).length * weight(l);
      }, 0);
  const taken = count("APPROVED");
  const pending = count("PENDING");
  const total = allowance + carryover;
  return { allowance, carryover, total, taken, pending, remaining: total - taken - pending };
}

/** Resturlaub, der für das Jahr gilt. */
export function carryoverFor(user: { carryoverDays: number; carryoverYear: number | null }, year: number) {
  return user.carryoverYear === year ? user.carryoverDays : 0;
}

const berlinDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });

type Employment = { createdAt: Date; entryDate?: string | null; exitDate?: string | null };

/** Ab diesem Tag zählt das Soll: Eintrittsdatum, sonst Anlage der Person in TeamZeit. */
export function trackingStart(user: Employment): string {
  return user.entryDate ?? berlinDay.format(user.createdAt);
}

/** War die Person an diesem Tag beschäftigt (zwischen Eintritt und Austritt)? */
export function employedOn(user: Employment, d: string): boolean {
  return d >= trackingStart(user) && (!user.exitDate || d <= user.exitDate);
}

/** Soll-Stunden, begrenzt auf die Beschäftigungszeit (Eintritt bis Austritt). */
export function targetHoursFor(
  user: { weeklyHours: number } & Employment,
  from: string,
  to: string,
  leaves: Parameters<typeof targetHours>[3],
): number {
  const start = trackingStart(user);
  const s = from > start ? from : start;
  const e = user.exitDate && user.exitDate < to ? user.exitDate : to;
  return e < s ? 0 : targetHours(user.weeklyHours, s, e, leaves);
}

/** Anteiliger Jahresurlaub nach der 1/12-Regel (je vollem Beschäftigungsmonat), auf halbe Tage gerundet. */
export function proRataVacation(allowance: number, year: number, user: Employment): { days: number; months: number } {
  const start = trackingStart(user);
  const from = start > `${year}-01-01` ? start : `${year}-01-01`;
  const to = user.exitDate && user.exitDate < `${year}-12-31` ? user.exitDate : `${year}-12-31`;
  if (to < from) return { days: 0, months: 0 };
  // Volle Kalendermonate im Zeitraum zählen
  let months = 0;
  for (let m = 1; m <= 12; m++) {
    const ms = `${year}-${String(m).padStart(2, "0")}-01`;
    const me = new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
    if (from <= ms && to >= me) months++;
  }
  return { days: Math.ceil(((allowance * months) / 12) * 2) / 2, months };
}
