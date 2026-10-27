"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteTimeEntry, updateTimeEntry } from "@/app/actions/time";

type P = { id: string; name: string; category: string; active: boolean };
type E = { id: string; date: string; dayLabel: string; hours: number; note: string | null; projectId: string; projectName: string };

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

export function EntryRow({ entry, projects, locked }: { entry: E; projects: P[]; locked: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateTimeEntry, undefined);
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing) {
    const options = projects.filter((p) => p.active || p.id === entry.projectId);
    return (
      <li className="px-5 py-3">
        <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="id" value={entry.id} />
          <span className="w-20 shrink-0 text-slate-500">{entry.dayLabel}</span>
          <input name="hours" defaultValue={fmt(entry.hours)} inputMode="decimal" className="input w-20!" aria-label="Stunden" />
          <select name="projectId" defaultValue={entry.projectId} className="input w-auto! min-w-56 flex-1" aria-label="Projekt">
            {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input name="note" defaultValue={entry.note ?? ""} placeholder="Notiz" className="input min-w-40 flex-1" aria-label="Notiz" />
          <button className="btn-primary px-3! py-1.5! text-xs" disabled={pending}>Speichern</button>
          <button type="button" className="btn-ghost px-2! py-1.5! text-xs" onClick={() => setEditing(false)}>Abbrechen</button>
          {state?.error && <span className="w-full text-xs text-red-600">{state.error}</span>}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-4 px-5 py-2.5 text-sm">
      <span className="w-20 shrink-0 text-slate-500">{entry.dayLabel}</span>
      <span className="w-14 shrink-0 text-right font-medium tabular-nums">{fmt(entry.hours)} h</span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium">{entry.projectName}</span>
        {entry.note && <span className="ml-2 text-slate-500">· {entry.note}</span>}
      </span>
      {locked ? (
        <span className="text-xs text-slate-400" title="Monat abgeschlossen">🔒 abgeschlossen</span>
      ) : (
        <>
          <button className="btn-ghost px-2! py-1! text-xs" onClick={() => setEditing(true)}>Bearbeiten</button>
          <form action={deleteTimeEntry}>
            <input type="hidden" name="id" value={entry.id} />
            <button className="btn-danger px-2! py-1! text-xs">Löschen</button>
          </form>
        </>
      )}
    </li>
  );
}
