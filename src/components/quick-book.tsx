"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addTimeEntry } from "@/app/actions/time";
import { Icon } from "./icons";

type P = { id: string; name: string; category: string };

const CHIPS = [0.5, 1, 2, 3, 4, 8];
const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

/**
 * Zeit für den gewählten Tag buchen: Projekt wählen, Stunden per Schnellwahl oder Eingabe.
 * "Rest" schlägt die noch nicht verbuchte Arbeitszeit des Tages vor.
 */
export function QuickBook({ date, projects, recentIds, remaining }: { date: string; projects: P[]; recentIds: string[]; remaining: number }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("");
  const [state, action, pending] = useActionState(addTimeEntry, undefined);
  const noteRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state?.ok) {
      setHours("");
      if (noteRef.current) noteRef.current.value = "";
      setOpen(false);
    }
  }, [state]);

  const recent = recentIds.map((id) => projects.find((p) => p.id === id)).filter((p): p is P => !!p);
  const groups = Object.entries(Object.groupBy(projects, (p) => p.category));

  if (!open) {
    return (
      <div className="grid gap-2">
        <button type="button" onClick={() => setOpen(true)} className="btn-tinted min-h-12 w-full text-[16px]" disabled={projects.length === 0}>
          <Icon name="plus" className="h-5 w-5" /> Zeit buchen
        </button>
        {state?.ok && <p className="text-center text-[13px] text-emerald-700">{state.ok}</p>}
        {projects.length === 0 && (
          <p className="text-center text-[13px] text-slate-500">Noch keine Projekte vorhanden – sie werden unter „Projekte“ angelegt.</p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-3 rounded-xl bg-slate-50 p-3">
      <input type="hidden" name="date" value={date} />
      <div>
        <label className="label" htmlFor={`project-${date}`}>Projekt / Thema</label>
        <select className="input" id={`project-${date}`} name="projectId" required defaultValue={recent[0]?.id ?? ""}>
          <option value="" disabled>Bitte wählen …</option>
          {recent.length > 0 && (
            <optgroup label="Zuletzt verwendet">
              {recent.map((p) => <option key={`r-${p.id}`} value={p.id}>{p.name}</option>)}
            </optgroup>
          )}
          {groups.map(([cat, list]) => (
            <optgroup key={cat} label={cat}>
              {list!.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`hours-${date}`}>Stunden</label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Schnellwahl Stunden">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setHours(fmt(c))}
              className={`min-h-10 min-w-12 rounded-full border px-3 text-[15px] font-medium tabular-nums transition ${
                hours === fmt(c) ? "border-brand-600 bg-brand-600 text-onaccent" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {fmt(c)}
            </button>
          ))}
          {remaining > 0 && (
            <button
              type="button"
              onClick={() => setHours(fmt(remaining))}
              className={`min-h-10 rounded-full border px-3 text-[15px] font-medium tabular-nums ${
                hours === fmt(remaining) ? "border-brand-600 bg-brand-600 text-onaccent" : "border-brand-200 bg-brand-50 text-brand-700"
              }`}
            >
              Rest {fmt(remaining)}
            </button>
          )}
        </div>
        <input
          className="input mt-2"
          id={`hours-${date}`}
          name="hours"
          inputMode="decimal"
          placeholder="oder eingeben, z. B. 2,5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor={`note-${date}`}>Notiz (optional)</label>
        <input ref={noteRef} className="input" id={`note-${date}`} name="note" placeholder="Was wurde gemacht?" />
      </div>
      {state?.error && <p className="text-[13px] text-red-600" role="alert">{state.error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary min-h-12 flex-1 text-[16px]" disabled={pending}>{pending ? "Wird gebucht …" : "Buchen"}</button>
        <button type="button" className="btn-secondary min-h-12" onClick={() => setOpen(false)}>Abbrechen</button>
      </div>
    </form>
  );
}
