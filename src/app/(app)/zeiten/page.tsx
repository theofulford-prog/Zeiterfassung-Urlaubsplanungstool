import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  addDays, formatDateShort, holidayName, isValidISO, isWeekend, isoWeek, startOfWeek, todayISO, weekdayShort,
} from "@/lib/dates";
import { formatHours, formatNum } from "@/lib/format";
import { targetHoursFor } from "@/lib/stats";
import { addTimeEntry } from "@/app/actions/time";
import { canEditDate, editableFrom, LOCK_DAY } from "@/lib/lock";
import { can } from "@/lib/permissions";
import { formatMinutes, netMinutes } from "@/lib/worktime";
import { EntryRow } from "@/components/entry-row";
import { WorkDayRow } from "@/components/work-day-row";
import { ActionForm } from "@/components/action-form";
import { PageHeader, Stat } from "@/components/page-header";

export default async function ZeitenPage({ searchParams }: { searchParams: Promise<{ woche?: string }> }) {
  const user = await requireUser();
  const { woche } = await searchParams;
  const today = todayISO();
  const monday = startOfWeek(isValidISO(woche) ? woche : today);
  const sunday = addDays(monday, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const [entries, projects, leaves, workDays, allProjects] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId: user.id, date: { gte: monday, lte: sunday } },
      include: { project: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.project.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.leaveRequest.findMany({
      where: { userId: user.id, startDate: { lte: sunday }, endDate: { gte: monday } },
    }),
    prisma.workDay.findMany({ where: { userId: user.id, date: { gte: monday, lte: sunday } } }),
    prisma.project.findMany({ select: { id: true, name: true, category: true, active: true }, orderBy: { name: "asc" } }),
  ]);
  const workByDate = new Map(workDays.map((w) => [w.date, w]));
  const netWeek = workDays.reduce((s, w) => s + netMinutes(w), 0);
  const isAdmin = can(user.role, "time.editAll");

  const total = entries.reduce((s, e) => s + e.hours, 0);
  const target = targetHoursFor(user, monday, sunday, leaves);
  // In der laufenden Woche zählt für die Differenz nur das Soll bis heute.
  const isCurrentWeek = today >= monday && today <= sunday;
  const targetSoFar = isCurrentWeek ? targetHoursFor(user, monday, today, leaves) : target;
  const diff = (isCurrentWeek ? entries.filter((e) => e.date <= today).reduce((s, e) => s + e.hours, 0) : total) - targetSoFar;
  const byProject = new Map<string, { id: string; name: string; category: string; perDay: number[]; sum: number }>();
  for (const e of entries) {
    const row = byProject.get(e.projectId) ?? { id: e.projectId, name: e.project.name, category: e.project.category, perDay: Array(7).fill(0), sum: 0 };
    row.perDay[days.indexOf(e.date)] += e.hours;
    row.sum += e.hours;
    byProject.set(e.projectId, row);
  }
  const dayTotals = days.map((d) => entries.filter((e) => e.date === d).reduce((s, e) => s + e.hours, 0));
  const absentOn = (d: string) =>
    leaves.find((l) => l.status === "APPROVED" && l.startDate <= d && l.endDate >= d);
  const defaultDate = today >= monday && today <= sunday ? today : monday;

  const grouped = Object.entries(Object.groupBy(projects, (p) => p.category));

  return (
    <>
      <PageHeader title="Meine Zeiten" subtitle={`KW ${isoWeek(monday)} · ${formatDateShort(monday)} – ${formatDateShort(sunday)}${sunday.slice(0, 4)}`}>
        <Link className="btn-secondary" href={`/zeiten?woche=${addDays(monday, -7)}`}>← Vorwoche</Link>
        <Link className="btn-ghost" href="/zeiten">Heute</Link>
        <Link className="btn-secondary" href={`/zeiten?woche=${addDays(monday, 7)}`}>Nächste →</Link>
        <a className="btn-ghost" href={`/api/export?typ=arbeitszeit&von=${monday.slice(0, 7)}-01&bis=${sunday}`} title="Eigene Arbeitszeiten des Monats als CSV">Export</a>
      </PageHeader>

      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        <Stat label="Erfasst diese Woche" value={formatHours(total)} />
        <Stat label="Soll diese Woche" value={formatHours(target)} hint={`${formatNum(user.weeklyHours)} h/Woche abzgl. Feiertage & Abwesenheit`} />
        <Stat
          label={isCurrentWeek ? "Differenz bis heute" : "Differenz"}
          value={`${diff >= 0 ? "+" : ""}${formatHours(diff)}`}
          hint={isCurrentWeek ? `Soll bis heute: ${formatHours(targetSoFar)}` : undefined}
          tone={diff < -0.01 ? "warn" : "good"}
        />
      </div>

      <section className="card mb-6 p-5">
        <h2 className="mb-4 font-semibold">Zeit buchen</h2>
        {projects.length === 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            Es gibt noch keine Projekte oder Themen. Sie werden von der Geschäftsführung bzw. Projektleitung unter „Projekte“ angelegt.
          </p>
        )}
        <ActionForm action={addTimeEntry} submitLabel="Buchen" resetOnSuccess className="grid gap-3 sm:grid-cols-[150px_1fr_110px_1fr]">
          <div>
            <label className="label" htmlFor="date">Datum</label>
            <input
              className="input" type="date" id="date" name="date" defaultValue={defaultDate} required
              min={isAdmin ? undefined : editableFrom()} max={isAdmin ? undefined : today}
            />
          </div>
          <div>
            <label className="label" htmlFor="projectId">Projekt / Thema</label>
            <select className="input" id="projectId" name="projectId" required defaultValue="">
              <option value="" disabled>Bitte wählen …</option>
              {grouped.map(([cat, list]) => (
                <optgroup key={cat} label={cat}>
                  {list!.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="hours">Stunden</label>
            <input className="input" id="hours" name="hours" inputMode="decimal" placeholder="z. B. 2,5" required data-reset />
          </div>
          <div>
            <label className="label" htmlFor="note">Notiz (optional)</label>
            <input className="input" id="note" name="note" placeholder="Was wurde gemacht?" data-reset />
          </div>
        </ActionForm>
      </section>

      <section className="card mb-6 overflow-x-auto">
        <table className="data-table min-w-[640px]">
          <thead>
            <tr>
              <th>Projekt</th>
              {days.map((d) => (
                <th key={d} className={`text-right! ${isWeekend(d) || holidayName(d) ? "bg-slate-50" : ""} ${d === today ? "text-brand-700!" : ""}`} title={holidayName(d)}>
                  {weekdayShort(d)} {formatDateShort(d)}
                </th>
              ))}
              <th className="text-right!">Summe</th>
            </tr>
          </thead>
          <tbody>
            {[...byProject.values()].map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="font-medium">{r.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{r.category}</span>
                </td>
                {r.perDay.map((h, i) => (
                  <td key={i} className="text-right tabular-nums">{h ? formatNum(h) : <span className="text-slate-300">–</span>}</td>
                ))}
                <td className="text-right font-medium tabular-nums">{formatNum(r.sum)}</td>
              </tr>
            ))}
            {byProject.size === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">Diese Woche noch nichts gebucht.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-medium">
              <td className="px-3 py-2">Gesamt</td>
              {dayTotals.map((h, i) => {
                const absence = absentOn(days[i]);
                const hol = holidayName(days[i]);
                return (
                  <td key={i} className="px-3 py-2 text-right tabular-nums">
                    {hol ? <span className="text-xs font-normal text-slate-400">Feiertag</span>
                      : absence ? <span className="text-xs font-normal text-sky-600">{absence.type === "SICK" ? "krank" : "Urlaub"}</span>
                      : h || isWeekend(days[i]) ? (h ? formatNum(h) : <span className="font-normal text-slate-300">–</span>) : formatNum(h)}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right tabular-nums">{formatNum(total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="card mb-6 overflow-x-auto">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-2">
          <div>
            <h2 className="font-semibold">Arbeitszeit</h2>
            <p className="text-xs text-slate-500">Gesetzliche Arbeitszeiterfassung: Beginn, Ende und Pause pro Tag. Leer lassen und speichern entfernt den Eintrag.</p>
          </div>
          <span className="text-sm text-slate-600">Netto diese Woche: <b className="tabular-nums">{formatMinutes(netWeek)}</b></span>
        </div>
        <table className="data-table min-w-[760px]">
          <thead>
            <tr><th>Tag</th><th>Beginn</th><th>Ende</th><th>Pause (Min.)</th><th className="text-right!">Netto</th><th>Hinweise</th><th></th></tr>
          </thead>
          <tbody>
            {days.map((d, i) => {
              const absence = absentOn(d);
              const hol = holidayName(d);
              const w = workByDate.get(d);
              return (
                <WorkDayRow
                  key={`${d}-${w?.start}-${w?.end}-${w?.breakMinutes}`}
                  date={d}
                  label={`${weekdayShort(d)} ${formatDateShort(d)}`}
                  muted={isWeekend(d) || !!hol}
                  locked={!canEditDate(d, user.role)}
                  booked={dayTotals[i]}
                  initial={w ? { start: w.start, end: w.end, breakMinutes: w.breakMinutes } : undefined}
                  absence={hol ?? (absence ? (absence.type === "SICK" ? "krank" : "abwesend") : undefined)}
                />
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold">Buchungen dieser Woche</h2>
          {!isAdmin && (
            <p className="text-xs text-slate-500">Korrekturen sind bis zum {LOCK_DAY}. des Folgemonats möglich, danach ist der Monat abgeschlossen.</p>
          )}
        </div>
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              projects={allProjects}
              locked={!canEditDate(e.date, user.role)}
              entry={{
                id: e.id, date: e.date, dayLabel: `${weekdayShort(e.date)} ${formatDateShort(e.date)}`,
                hours: e.hours, note: e.note, projectId: e.projectId, projectName: e.project.name,
              }}
            />
          ))}
          {entries.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-400">Keine Buchungen.</li>}
        </ul>
      </section>
    </>
  );
}
