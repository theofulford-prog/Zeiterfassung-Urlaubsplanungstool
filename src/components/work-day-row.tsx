"use client";

import { useActionState } from "react";
import { saveWorkDay } from "@/app/actions/time";
import { arbzgWarnings, formatMinutes, netMinutes } from "@/lib/worktime";

export function WorkDayRow({
  date, label, muted, locked, booked, initial, absence, employmentId,
}: {
  date: string;
  employmentId?: string;
  label: string;
  muted: boolean;
  locked: boolean;
  booked: number;
  initial?: { start: string; end: string | null; breakMinutes: number };
  absence?: string;
}) {
  const [state, action, pending] = useActionState(saveWorkDay, undefined);
  const formId = `wd-${date}${employmentId ? `-${employmentId}` : ""}`;
  const net = initial ? netMinutes(initial) : 0;
  const warnings = initial ? arbzgWarnings(initial) : [];
  const diff = initial ? booked * 60 - net : 0;

  return (
    <tr className={muted ? "bg-slate-50/60 text-slate-500" : ""}>
      <td className="whitespace-nowrap">{label}{absence && <span className="ml-2 text-xs text-sky-600">{absence}</span>}</td>
      <td><input form={formId} name="start" type="time" defaultValue={initial?.start} disabled={locked} className="input w-28! py-1!" /></td>
      <td><input form={formId} name="end" type="time" defaultValue={initial?.end ?? undefined} disabled={locked} className="input w-28! py-1!" /></td>
      <td>
        <input form={formId} name="breakMinutes" inputMode="numeric" defaultValue={initial?.breakMinutes ?? ""} placeholder="0" disabled={locked} className="input w-20! py-1!" />
      </td>
      <td className="text-right whitespace-nowrap tabular-nums">{initial ? formatMinutes(net) : "–"}</td>
      <td className="text-xs">
        {state?.error && <span className="text-red-600">{state.error}</span>}
        {!state?.error && warnings.map((w) => <div key={w} className="text-amber-700">⚠ {w}</div>)}
        {!state?.error && initial && Math.abs(diff) >= 15 && (
          <div className="text-slate-500">
            Projekte {diff > 0 ? "+" : ""}{formatMinutes(diff)} {diff > 0 ? "mehr" : "weniger"} gebucht
          </div>
        )}
        {!state?.error && !initial && booked > 0 && !muted && <span className="text-slate-400">Beginn/Ende fehlt</span>}
      </td>
      <td className="text-right">
        {!locked && (
          <form id={formId} action={action}>
            <input type="hidden" name="date" value={date} />
            {employmentId && <input type="hidden" name="employmentId" value={employmentId} />}
            <button className="btn-secondary px-2.5! py-1! text-xs" disabled={pending}>{pending ? "…" : "Speichern"}</button>
          </form>
        )}
      </td>
    </tr>
  );
}
