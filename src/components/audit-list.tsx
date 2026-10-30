import type { AuditLog } from "@prisma/client";
import type { AuditAction } from "@/lib/audit";
import { AUDIT_ACTION_LABELS, FIELD_LABELS } from "@/lib/audit-labels";
import type { Changes } from "@/lib/audit-diff";
import { visibleChanges } from "@/lib/audit-view";
import { formatDate, isValidISO } from "@/lib/dates";
import { CONTRACT_TYPES, formatWorkDays } from "@/lib/employment";
import { normalizeRole, ROLE_INFO } from "@/lib/permissions";

const dateTime = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" });

const PAY_TYPES: Record<string, string> = { MONTHLY: "Monatsgehalt", HOURLY: "Stundenlohn" };

/** Werte lesbar machen: Gesellschaft statt ID, Vertragsart statt Code, Datum deutsch. */
function show(field: string, v: unknown, names: Map<string, string>): string {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "boolean") return v ? "ja" : "nein";
  if (field === "workDays" && Array.isArray(v)) return formatWorkDays(v as number[]);
  if (Array.isArray(v)) return v.join(", ");
  const s = String(v);
  if (field === "companyId") return names.get(s) ?? s;
  if (field === "contractType") return CONTRACT_TYPES[s as keyof typeof CONTRACT_TYPES] ?? s;
  if (field === "payType") return PAY_TYPES[s] ?? s;
  if (field === "role") return ROLE_INFO[normalizeRole(s)].label;
  if (isValidISO(s)) return formatDate(s);
  return s;
}

/** Einträge des Änderungsprotokolls. Sensible Felder erscheinen nur als „geändert“. */
export function AuditList({ entries, actors, empty, viewer, names = new Map() }: {
  entries: AuditLog[];
  actors: Map<string, string>;
  empty: string;
  /** Was der Betrachter sehen darf – Kostensatz bzw. Vergütung sonst nur als „geändert“ */
  viewer: { showCosts: boolean; showPay: boolean };
  /** Namen zu IDs in den Werten, z. B. Gesellschaften */
  names?: Map<string, string>;
}) {
  return (
    <ul className="divide-y divide-slate-100 text-[14px]">
      {entries.map((e) => {
        const changes = Object.entries(visibleChanges((e.changes ?? {}) as Changes, viewer) as Record<string, { from?: unknown; to?: unknown; changed?: true }>);
        return (
          <li key={e.id} className="px-4 py-3 md:px-5">
            <p>
              <b>{AUDIT_ACTION_LABELS[e.action as AuditAction] ?? e.action}</b>
              <span className="text-slate-500"> · {dateTime.format(e.at)} · {e.actorId ? actors.get(e.actorId) ?? "unbekannt" : "System"}</span>
            </p>
            {changes.length > 0 && (
              <p className="mt-0.5 text-[13px] text-slate-500">
                {changes
                  .map(([field, c]) => {
                    const label = FIELD_LABELS[field] ?? field;
                    if (c.changed || e.action === "personal.read") return label;
                    return `${label}: ${show(field, c.from, names)} → ${show(field, c.to, names)}`;
                  })
                  .join(" · ")}
              </p>
            )}
            {e.reason && <p className="mt-0.5 text-[13px] text-slate-500">Begründung: {e.reason}</p>}
          </li>
        );
      })}
      {entries.length === 0 && <li className="px-4 py-5 text-center text-slate-500 md:px-5">{empty}</li>}
    </ul>
  );
}
