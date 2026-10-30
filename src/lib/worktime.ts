// Arbeitszeit nach Arbeitszeitgesetz (ArbZG): Beginn, Ende, Pause.

export function parseHM(s: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function formatMinutes(min: number): string {
  const sign = min < 0 ? "−" : "";
  const a = Math.abs(Math.round(min));
  return `${sign}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")} h`;
}

/** Netto-Arbeitszeit in Minuten (Ende − Beginn − Pause). */
type WorkLike = { start: string; end: string | null; breakMinutes: number };

export function netMinutes(w: WorkLike): number {
  const s = parseHM(w.start);
  const e = w.end ? parseHM(w.end) : null;
  if (s === null || e === null) return 0;
  return Math.max(0, e - s - w.breakMinutes);
}

/** Hinweise nach ArbZG §3/§4: max. 10 h/Tag, Pausen 30 min ab 6 h, 45 min ab 9 h. */
export function arbzgWarnings(w: WorkLike): string[] {
  const s = parseHM(w.start);
  const e = w.end ? parseHM(w.end) : null;
  if (s === null || e === null) return [];
  const net = e - s - w.breakMinutes;
  const out: string[] = [];
  if (net > 600) out.push("mehr als 10 Stunden Arbeitszeit");
  if (net > 9 * 60 && w.breakMinutes < 45) out.push("über 9 Stunden sind 45 Min. Pause vorgeschrieben");
  else if (net > 6 * 60 && w.breakMinutes < 30) out.push("über 6 Stunden sind 30 Min. Pause vorgeschrieben");
  return out;
}

/** Vorgeschriebene Mindestpause in Minuten für eine Arbeitszeit (ohne Pause) nach § 4 ArbZG. */
export function requiredBreak(workMinutes: number): number {
  return workMinutes > 9 * 60 ? 45 : workMinutes > 6 * 60 ? 30 : 0;
}

const berlinTime = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hour12: false });

/** Aktuelle Uhrzeit in deutscher Zeit als HH:MM. */
export function nowHM(): string {
  return berlinTime.format(new Date());
}
