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
export function netMinutes(w: { start: string; end: string; breakMinutes: number }): number {
  const s = parseHM(w.start);
  const e = parseHM(w.end);
  if (s === null || e === null) return 0;
  return Math.max(0, e - s - w.breakMinutes);
}

/** Hinweise nach ArbZG §3/§4: max. 10 h/Tag, Pausen 30 min ab 6 h, 45 min ab 9 h. */
export function arbzgWarnings(w: { start: string; end: string; breakMinutes: number }): string[] {
  const s = parseHM(w.start);
  const e = parseHM(w.end);
  if (s === null || e === null) return [];
  const net = e - s - w.breakMinutes;
  const out: string[] = [];
  if (net > 600) out.push("mehr als 10 Stunden Arbeitszeit");
  if (net > 9 * 60 && w.breakMinutes < 45) out.push("über 9 Stunden sind 45 Min. Pause vorgeschrieben");
  else if (net > 6 * 60 && w.breakMinutes < 30) out.push("über 6 Stunden sind 30 Min. Pause vorgeschrieben");
  return out;
}
