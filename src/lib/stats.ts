import { countWorkdays, daysInRange, isWorkday, isWorkdayFor } from "./dates";
import { termSegments, termsOn, type TermsLike } from "./terms";

export type LeaveLike = { startDate: string; endDate: string; status: string; type: string; halfDay?: boolean };

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

// ---------------------------------------------------------------------------
// Rechnen je Arbeitsverhältnis (Konditionen mit Gültig-ab-Datum, eigene Arbeitstage je Vertrag)

export type EmploymentLike = {
  id: string;
  startDate: string;
  endDate: string | null;
  carryoverDays: number;
  carryoverYear: number | null;
  terms: TermsLike[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Zeitraum auf die Dauer des Arbeitsverhältnisses begrenzen; null, wenn nichts übrig bleibt. */
function clipToEmployment(emp: EmploymentLike, from: string, to: string): [string, string] | null {
  const s = from > emp.startDate ? from : emp.startDate;
  const e = emp.endDate && emp.endDate < to ? emp.endDate : to;
  return e < s ? null : [s, e];
}

/**
 * Soll-Stunden eines Arbeitsverhältnisses im Zeitraum. Tagessoll = Wochenstunden / Zahl der Arbeitstage
 * der am Tag gültigen Konditionen; genehmigte Abwesenheiten senken das Soll an Arbeitstagen des Vertrags.
 * null = die Konditionen sehen kein Soll vor.
 */
export function employmentTargetHours(emp: EmploymentLike, from: string, to: string, leaves: LeaveLike[]): number | null {
  const range = clipToEmployment(emp, from, to);
  if (!range) return emp.terms.some((t) => t.weeklyHours !== null) ? 0 : null;
  const segments = termSegments(emp.terms, range[0], range[1]);
  if (!segments.some((s) => s.terms.weeklyHours !== null)) return null;
  const absent = absentDays(leaves, range[0], range[1]);
  let sum = 0;
  for (const seg of segments) {
    const { weeklyHours, workDays } = seg.terms;
    if (weeklyHours === null || workDays.length === 0) continue;
    const daily = weeklyHours / workDays.length;
    for (const d of daysInRange(seg.from, seg.to)) {
      if (isWorkdayFor(d, workDays)) sum += daily * (1 - Math.min(1, absent.get(d) ?? 0));
    }
  }
  return round2(sum);
}

/** Soll einer Person über alle Arbeitsverhältnisse; null, wenn keines ein Soll hat. */
export function personTargetHours(emps: EmploymentLike[], from: string, to: string, leaves: LeaveLike[]): number | null {
  const values = emps.map((e) => employmentTargetHours(e, from, to, leaves)).filter((v): v is number => v !== null);
  return values.length ? round2(values.reduce((s, v) => s + v, 0)) : null;
}

/** Jahresurlaub: je vollem Beschäftigungsmonat 1/12 der zum Monatsersten gültigen Urlaubstage, auf halbe Tage aufgerundet. */
export function employmentVacationAllowance(emp: EmploymentLike, year: number): number {
  let twelfths = 0;
  for (let m = 1; m <= 12; m++) {
    const ms = `${year}-${String(m).padStart(2, "0")}-01`;
    const me = new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
    if (emp.startDate > ms || (emp.endDate !== null && emp.endDate < me)) continue;
    twelfths += termsOn(emp.terms, ms)?.vacationDaysPerYear ?? 0;
  }
  const days = Math.round((twelfths / 12) * 1e6) / 1e6;
  return Math.ceil(days * 2) / 2;
}

/**
 * Urlaubskonto eines Arbeitsverhältnisses für ein Kalenderjahr. Gezählt werden Urlaubstage an Arbeitstagen
 * dieses Vertrags; Tage mit genehmigter Krankheit im Urlaub werden nicht angerechnet (§ 9 BUrlG).
 */
export function employmentVacationBalance(emp: EmploymentLike, year: number, leaves: LeaveLike[]) {
  const allowance = employmentVacationAllowance(emp, year);
  const carryover = emp.carryoverYear === year ? emp.carryoverDays : 0;
  const range = clipToEmployment(emp, `${year}-01-01`, `${year}-12-31`);
  const sick = new Set(
    range
      ? leaves.filter((l) => l.type === "SICK" && l.status === "APPROVED")
        .flatMap((l) => { const r = clip(l, range[0], range[1]); return r ? daysInRange(r[0], r[1]) : []; })
      : [],
  );
  const count = (status: string) => {
    if (!range) return 0;
    return leaves
      .filter((l) => l.type === "VACATION" && l.status === status)
      .reduce((sum, l) => {
        const r = clip(l, range[0], range[1]);
        if (!r) return sum;
        const days = daysInRange(r[0], r[1]).filter((d) => !sick.has(d) && isWorkdayFor(d, termsOn(emp.terms, d)?.workDays ?? []));
        return sum + days.length * weight(l);
      }, 0);
  };
  const taken = count("APPROVED");
  const pending = count("PENDING");
  const total = allowance + carryover;
  return { allowance, carryover, total, taken, pending, remaining: total - taken - pending };
}
