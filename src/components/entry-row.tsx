"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteTimeEntry, updateTimeEntry } from "@/app/actions/time";
import { Icon } from "./icons";

type P = { id: string; name: string; category: string; active: boolean };
type E = { id: string; date: string; dayLabel: string; hours: number; note: string | null; projectId: string; projectName: string };

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

/** Eine Buchung: Projektname vollständig lesbar, Stunden rechts, Bearbeiten/Löschen als große Symbole. */
export function EntryRow({ entry, projects, locked, showDay = false }: { entry: E; projects: P[]; locked: boolean; showDay?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateTimeEntry, undefined);
  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  if (editing) {
    const options = projects.filter((p) => p.active || p.id === entry.projectId);
    return (
      <li className="py-3">
        <form action={action} className="grid gap-2 rounded-xl bg-slate-50 p-3">
          <input type="hidden" name="id" value={entry.id} />
          <div>
            <label className="label" htmlFor={`p-${entry.id}`}>Projekt / Thema</label>
            <select id={`p-${entry.id}`} name="projectId" defaultValue={entry.projectId} className="input">
              {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-[6rem_1fr] gap-2">
            <div>
              <label className="label" htmlFor={`h-${entry.id}`}>Stunden</label>
              <input id={`h-${entry.id}`} name="hours" defaultValue={fmt(entry.hours)} inputMode="decimal" className="input" />
            </div>
            <div>
              <label className="label" htmlFor={`n-${entry.id}`}>Notiz</label>
              <input id={`n-${entry.id}`} name="note" defaultValue={entry.note ?? ""} className="input" />
            </div>
          </div>
          {state?.error && <p className="text-[13px] text-red-600" role="alert">{state.error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={pending}>{pending ? "Speichern …" : "Speichern"}</button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Abbrechen</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        {showDay && <p className="text-[12px] text-slate-500">{entry.dayLabel}</p>}
        <p className="text-[15px] leading-snug font-medium">{entry.projectName}</p>
        {entry.note && <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{entry.note}</p>}
      </div>
      <span className="shrink-0 pt-0.5 text-[16px] font-semibold tabular-nums">{fmt(entry.hours)} h</span>
      {locked ? (
        <span className="shrink-0 pt-1 text-[12px] text-slate-400" title="Monat abgeschlossen">gesperrt</span>
      ) : (
        <div className="-my-1 flex shrink-0">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-brand-700"
            onClick={() => setEditing(true)}
            aria-label={`Buchung ${entry.projectName} bearbeiten`}
          >
            <Icon name="pencil" className="h-[18px] w-[18px]" />
          </button>
          <form action={deleteTimeEntry}>
            <input type="hidden" name="id" value={entry.id} />
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
              aria-label={`Buchung ${entry.projectName} löschen`}
            >
              <Icon name="trash" className="h-[18px] w-[18px]" />
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
