"use client";

import { useState } from "react";

/** Gemeinsame Felder für Abwesenheiten – bei "halber Tag" entfällt das Enddatum. */
export function LeaveFields() {
  const [half, setHalf] = useState(false);
  return (
    <>
      <div>
        <label className="label" htmlFor="type">Art</label>
        <select className="input" id="type" name="type" defaultValue="VACATION">
          <option value="VACATION">Urlaub</option>
          <option value="SICK">Krankheit</option>
          <option value="OTHER">Sonstiges (z. B. Fortbildung)</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="startDate">{half ? "Datum" : "Von"}</label>
        <input className="input" type="date" id="startDate" name="startDate" required />
      </div>
      <div>
        <label className="label" htmlFor="endDate">Bis (inklusive)</label>
        <input className="input" type="date" id="endDate" name="endDate" required={!half} disabled={half} />
      </div>
      <div>
        <label className="label" htmlFor="note">Notiz (optional)</label>
        <input className="input" id="note" name="note" data-reset />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-full">
        <input type="checkbox" name="halfDay" checked={half} onChange={(e) => setHalf(e.target.checked)} className="h-4 w-4 accent-brand-600" />
        Nur ein halber Tag
      </label>
    </>
  );
}
