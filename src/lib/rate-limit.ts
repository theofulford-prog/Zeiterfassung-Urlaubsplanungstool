// Einfache Sperre gegen Passwort-Raten (im Speicher; reicht für eine einzelne App-Instanz).
const attempts = new Map<string, { count: number; until: number }>();
const MAX = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function isLocked(key: string): boolean {
  const a = attempts.get(key);
  return !!a && a.count >= MAX && a.until > Date.now();
}

export function registerFailure(key: string) {
  const a = attempts.get(key);
  if (!a || a.until < Date.now()) attempts.set(key, { count: 1, until: Date.now() + WINDOW_MS });
  else a.count++;
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
