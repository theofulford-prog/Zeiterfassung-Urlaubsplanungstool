// Alle Kalendertage werden als "YYYY-MM-DD"-Strings behandelt, um Zeitzonenprobleme zu vermeiden.

export function toISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const berlinDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });

/** Heutiges Datum in deutscher Zeit – unabhängig von der Zeitzone des Servers (Azure läuft in UTC). */
export function todayISO(): string {
  return berlinDate.format(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** Montag der Woche, in der der Tag liegt. */
export function startOfWeek(s: string): string {
  const dow = (parseISO(s).getUTCDay() + 6) % 7; // Mo=0
  return addDays(s, -dow);
}

export function isValidISO(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;
}

export function monthStart(s: string): string {
  return s.slice(0, 7) + "-01";
}

export function monthEnd(s: string): string {
  const d = parseISO(monthStart(s));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return toISO(d);
}

export function addMonths(s: string, n: number): string {
  const d = parseISO(monthStart(s));
  d.setUTCMonth(d.getUTCMonth() + n);
  return toISO(d);
}

export function daysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

function easterSunday(year: number): string {
  // Anonymer Gregorianischer Algorithmus
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toISO(new Date(Date.UTC(year, month - 1, day)));
}

const holidayCache = new Map<number, Map<string, string>>();

/** Gesetzliche Feiertage in Nordrhein-Westfalen. */
export function holidays(year: number): Map<string, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const map = new Map<string, string>([
    [`${year}-01-01`, "Neujahr"],
    [addDays(easter, -2), "Karfreitag"],
    [addDays(easter, 1), "Ostermontag"],
    [`${year}-05-01`, "Tag der Arbeit"],
    [addDays(easter, 39), "Christi Himmelfahrt"],
    [addDays(easter, 50), "Pfingstmontag"],
    [addDays(easter, 60), "Fronleichnam"],
    [`${year}-10-03`, "Tag der Deutschen Einheit"],
    [`${year}-11-01`, "Allerheiligen"],
    [`${year}-12-25`, "1. Weihnachtstag"],
    [`${year}-12-26`, "2. Weihnachtstag"],
  ]);
  holidayCache.set(year, map);
  return map;
}

export function holidayName(s: string): string | undefined {
  return holidays(Number(s.slice(0, 4))).get(s);
}

export function isWeekend(s: string): boolean {
  const dow = parseISO(s).getUTCDay();
  return dow === 0 || dow === 6;
}

export function isWorkday(s: string): boolean {
  return !isWeekend(s) && !holidayName(s);
}

export function countWorkdays(from: string, to: string): number {
  if (to < from) return 0;
  return daysInRange(from, to).filter(isWorkday).length;
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export function weekdayShort(s: string): string {
  return WEEKDAYS[parseISO(s).getUTCDay()];
}

export function formatDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

export function formatDateShort(s: string): string {
  const [, m, d] = s.split("-");
  return `${d}.${m}.`;
}

export function monthLabel(s: string): string {
  return `${MONTHS[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`;
}

export function monthLabelShort(s: string): string {
  return `${MONTHS[Number(s.slice(5, 7)) - 1].slice(0, 3)} ${s.slice(2, 4)}`;
}

/** ISO-Kalenderwoche */
export function isoWeek(s: string): number {
  const d = parseISO(s);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

const WEEKDAYS_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/** z. B. "Dienstag, 27. Oktober" */
export function formatDayLong(s: string): string {
  return `${WEEKDAYS_LONG[parseISO(s).getUTCDay()]}, ${Number(s.slice(8))}. ${MONTHS[Number(s.slice(5, 7)) - 1]}`;
}

/** Kompakter Zeitraum, z. B. "16.–20.11.2026", "28.10.–3.11.2026" oder "5.11.2026" */
export function formatRange(a: string, b: string): string {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  if (a === b) return `${da}.${mb}.${yb}`;
  if (ya === yb && ma === mb) return `${da}.–${db}.${mb}.${yb}`;
  if (ya === yb) return `${da}.${ma}.–${db}.${mb}.${yb}`;
  return `${da}.${ma}.${ya} – ${db}.${mb}.${yb}`;
}
