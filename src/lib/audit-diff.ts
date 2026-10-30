// Ermittelt für das Änderungsprotokoll, welche Felder sich geändert haben. Sensible Felder nur als „geändert“.

export type Changes = Record<string, { from: unknown; to: unknown } | { changed: true }>;

/** Werden nie mit Werten protokolliert. */
export const SENSITIVE_FIELDS: readonly string[] = ["taxIdEnc", "socialSecurityEnc", "ibanEnc"];

const DEFAULT_IGNORE = ["id", "createdAt", "updatedAt", "passwordHash"];

function comparable(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === "object") return JSON.stringify(v);
  return v;
}

function plain(v: unknown): unknown {
  return v instanceof Date ? v.toISOString() : v ?? null;
}

export function diffChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  opts: { sensitive?: readonly string[]; ignore?: readonly string[] } = {},
): Changes {
  const sensitive = new Set([...SENSITIVE_FIELDS, ...(opts.sensitive ?? [])]);
  const ignore = new Set([...DEFAULT_IGNORE, ...(opts.ignore ?? [])]);
  const out: Changes = {};
  for (const [field, to] of Object.entries(after)) {
    if (ignore.has(field)) continue;
    const from = before ? before[field] : null;
    if (!before && (to === null || to === undefined)) continue;
    if (comparable(from ?? null) === comparable(to ?? null)) continue;
    out[field] = sensitive.has(field) ? { changed: true } : { from: plain(from), to: plain(to) };
  }
  return out;
}
