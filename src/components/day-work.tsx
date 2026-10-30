"use client";

import { useActionState, useEffect, useState } from "react";
import { saveWorkDay, stampWork } from "@/app/actions/time";
import { arbzgWarnings, formatMinutes, netMinutes } from "@/lib/worktime";
import { Icon } from "./icons";

type Work = { start: string; end: string | null; breakMinutes: number };

/**
 * Arbeitszeit eines Tages: am heutigen Tag als Stempeluhr (Beginn/Feierabend per Knopfdruck),
 * sonst als kompakte Zusammenfassung mit Bearbeiten.
 */
export function DayWork({ date, isToday, locked, work, booked }: { date: string; isToday: boolean; locked: boolean; work?: Work; booked: number }) {
  const [stampState, stamp, stamping] = useActionState(stampWork, undefined);
  const [saveState, save, saving] = useActionState(saveWorkDay, undefined);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (saveState?.ok) setEditing(false);
  }, [saveState]);

  const running = !!work && !work.end;
  const net = work ? netMinutes(work) : 0;
  const warnings = work ? arbzgWarnings(work) : [];
  const diff = work?.end ? booked * 60 - net : 0;
  const msg = stampState ?? saveState;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-slate-500">Arbeitszeit</p>
          {work ? (
            <p className="text-[20px] leading-tight font-semibold tabular-nums">
              {work.start} – {work.end ?? <span className="text-brand-600">läuft</span>}
            </p>
          ) : (
            <p className="text-[15px] text-slate-500">{locked ? "Nicht erfasst" : "Noch nicht erfasst"}</p>
          )}
          {work && (work.end || work.breakMinutes > 0) && (
            <p className="mt-0.5 text-[13px] text-slate-500 tabular-nums">
              {[work.end ? `${formatMinutes(net)} netto` : null, work.breakMinutes > 0 ? `${work.breakMinutes} Min. Pause` : null].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {!locked && !editing && (work || !isToday) && (
          <button type="button" onClick={() => setEditing(true)} className="btn-ghost shrink-0 px-3!" aria-label="Arbeitszeit bearbeiten">
            <Icon name="pencil" className="h-[18px] w-[18px]" /> {work ? "Ändern" : "Eintragen"}
          </button>
        )}
      </div>

      {/* Stempeluhr nur für heute */}
      {isToday && !locked && !editing && (!work || running) && (
        <form action={stamp} className="grid gap-2">
          <input type="hidden" name="kind" value={running ? "end" : "start"} />
          <button className={`${running ? "btn-stop" : "btn-primary"} min-h-12 w-full text-[16px]`} disabled={stamping}>
            <Icon name={running ? "stop" : "play"} className="h-5 w-5" />
            {stamping ? "Wird gespeichert …" : running ? "Feierabend jetzt" : "Arbeitsbeginn jetzt"}
          </button>
          {!work && (
            <button type="button" onClick={() => setEditing(true)} className="text-[13px] text-brand-700 underline-offset-2 hover:underline">
              oder Zeiten manuell eintragen
            </button>
          )}
        </form>
      )}

      {editing && (
        <form action={save} className="grid gap-3 rounded-xl bg-slate-50 p-3">
          <input type="hidden" name="date" value={date} />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label" htmlFor={`start-${date}`}>Beginn</label>
              <input className="input px-2!" id={`start-${date}`} name="start" type="time" defaultValue={work?.start ?? ""} required />
            </div>
            <div>
              <label className="label" htmlFor={`end-${date}`}>Ende</label>
              <input className="input px-2!" id={`end-${date}`} name="end" type="time" defaultValue={work?.end ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor={`break-${date}`}>Pause (Min.)</label>
              <input className="input px-2!" id={`break-${date}`} name="breakMinutes" inputMode="numeric" defaultValue={work?.breakMinutes ?? ""} placeholder="0" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary flex-1" disabled={saving}>{saving ? "Speichern …" : "Speichern"}</button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Abbrechen</button>
          </div>
          <p className="text-[12px] text-slate-500">Ende leer lassen, wenn der Tag noch läuft. Beginn und Ende leeren und speichern entfernt den Eintrag.</p>
        </form>
      )}

      {msg?.error && <p className="text-[13px] text-red-600" role="alert">{msg.error}</p>}
      {msg?.ok && !editing && <p className="text-[13px] text-emerald-700">{msg.ok}</p>}
      {warnings.map((w) => (
        <p key={w} className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">⚠ Hinweis Arbeitszeitgesetz: {w}</p>
      ))}
      {work?.end && Math.abs(diff) >= 15 && (
        <p className="text-[13px] text-slate-500">
          Auf Projekte gebucht: {diff > 0 ? `${formatMinutes(diff)} mehr` : `${formatMinutes(-diff)} weniger`} als gearbeitet.
        </p>
      )}
    </div>
  );
}
