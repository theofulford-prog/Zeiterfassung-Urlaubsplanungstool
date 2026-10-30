import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  addDays, formatDateShort, formatDayLong, holidayName, isValidISO, isWeekend, isoWeek, startOfWeek, todayISO, weekdayShort,
} from "@/lib/dates";
import { formatHours, formatNum } from "@/lib/format";
import { targetHoursFor } from "@/lib/stats";
import { canEditDate, LOCK_DAY } from "@/lib/lock";
import { can } from "@/lib/permissions";
import { formatMinutes, netMinutes } from "@/lib/worktime";
import { EntryRow } from "@/components/entry-row";
import { WorkDayRow } from "@/components/work-day-row";
import { PageHeader } from "@/components/page-header";
import { PeriodNav } from "@/components/period-nav";
import { StatStrip } from "@/components/stat-strip";
import { WeekStrip } from "@/components/week-strip";
import { DayWork } from "@/components/day-work";
import { QuickBook } from "@/components/quick-book";
import { Icon } from "@/components/icons";

/**
 * Meine Zeiten – tagesbasiert: Wochenstreifen zum Antippen, darunter der gewählte Tag mit
 * Stempeluhr, Buchungen und "Zeit buchen". Die Wochentabellen gibt es zusätzlich auf großen Bildschirmen.
 */
export default async function ZeitenPage({ searchParams }: { searchParams: Promise<{ tag?: string; woche?: string }> }) {
  const user = await requireUser();
  const { tag, woche } = await searchParams;
  const today = todayISO();
  const selected = isValidISO(tag) ? tag : isValidISO(woche) ? startOfWeek(woche) : today;
  const monday = startOfWeek(selected);
  const sunday = addDays(monday, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const isCurrentWeek = today >= monday && today <= sunday;

  const [entries, leaves, workDays, allProjects, recent] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId: user.id, date: { gte: monday, lte: sunday } },
      include: { project: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.leaveRequest.findMany({ where: { userId: user.id, startDate: { lte: sunday }, endDate: { gte: monday } } }),
    prisma.workDay.findMany({ where: { userId: user.id, date: { gte: monday, lte: sunday } } }),
    prisma.project.findMany({ select: { id: true, name: true, category: true, active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.timeEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 40, select: { projectId: true } }),
  ]);
  const activeProjects = allProjects.filter((p) => p.active);
  const recentIds = [...new Set(recent.map((r) => r.projectId))].filter((id) => activeProjects.some((p) => p.id === id)).slice(0, 4);
  const workByDate = new Map(workDays.map((w) => [w.date, w]));
  const netWeek = workDays.reduce((s, w) => s + netMinutes(w), 0);

  const total = entries.reduce((s, e) => s + e.hours, 0);
  const target = targetHoursFor(user, monday, sunday, leaves);
  // In der laufenden Woche zählt für die Differenz nur das Soll bis heute.
  const targetSoFar = isCurrentWeek ? targetHoursFor(user, monday, today, leaves) : target;
  const diff = (isCurrentWeek ? entries.filter((e) => e.date <= today).reduce((s, e) => s + e.hours, 0) : total) - targetSoFar;
  const dayTotals = days.map((d) => entries.filter((e) => e.date === d).reduce((s, e) => s + e.hours, 0));
  const absentOn = (d: string) => leaves.find((l) => l.status === "APPROVED" && l.startDate <= d && l.endDate >= d);

  // Gewählter Tag
  const dayEntries = entries.filter((e) => e.date === selected);
  const dayBooked = dayEntries.reduce((s, e) => s + e.hours, 0);
  const dayWork = workByDate.get(selected);
  const dayLocked = !canEditDate(selected, user.role);
  const dayHoliday = holidayName(selected);
  const dayAbsence = absentOn(selected);
  const remaining = dayWork?.end ? Math.max(0, Math.round((netMinutes(dayWork) / 60 - dayBooked) * 4) / 4) : 0;

  const byProject = new Map<string, { id: string; name: string; category: string; perDay: number[]; sum: number }>();
  for (const e of entries) {
    const row = byProject.get(e.projectId) ?? { id: e.projectId, name: e.project.name, category: e.project.category, perDay: Array(7).fill(0), sum: 0 };
    row.perDay[days.indexOf(e.date)] += e.hours;
    row.sum += e.hours;
    byProject.set(e.projectId, row);
  }

  return (
    <>
      <PageHeader title="Meine Zeiten">
        <PeriodNav
          label={`KW ${isoWeek(monday)}`}
          sublabel={`${formatDateShort(monday)} – ${formatDateShort(sunday)}${sunday.slice(0, 4)}`}
          prevHref={`/zeiten?tag=${addDays(selected, -7)}`}
          nextHref={`/zeiten?tag=${addDays(selected, 7)}`}
          todayHref={isCurrentWeek ? undefined : "/zeiten"}
          prevLabel="Vorige Woche"
          nextLabel="Nächste Woche"
        />
      </PageHeader>

      <div className="grid gap-3 md:gap-4">
        <StatStrip
          items={[
            { label: "Erfasst", value: formatHours(total) },
            { label: "Soll", value: formatHours(target), hint: `${formatNum(user.weeklyHours)} h/Woche` },
            {
              label: isCurrentWeek ? "Saldo bis heute" : "Saldo",
              value: `${diff >= 0 ? "+" : ""}${formatHours(diff)}`,
              tone: diff < -0.01 ? "warn" : "good",
            },
          ]}
        />

        <WeekStrip
          selected={selected}
          days={days.map((d, i) => ({
            date: d, weekday: weekdayShort(d), day: Number(d.slice(8)), hours: dayTotals[i],
            off: isWeekend(d) || !!holidayName(d), absent: !!absentOn(d), today: d === today,
          }))}
        />

        {/* Der gewählte Tag */}
        <section className="card overflow-hidden" aria-labelledby="day-title">
          <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 px-4 py-3 md:px-5">
            <h2 id="day-title" className="flex min-w-0 items-center gap-2 text-[17px] font-semibold">
              <span className="truncate">{formatDayLong(selected)}</span>
              {selected === today && <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[12px] font-semibold text-brand-700">Heute</span>}
            </h2>
            <span className="shrink-0 text-[14px] text-slate-500 tabular-nums">{formatHours(dayBooked)}</span>
          </div>

          {(dayHoliday || dayAbsence) && (
            <p className="mx-4 mt-3 rounded-lg bg-sky-50 px-3 py-2 text-[13px] text-sky-900 md:mx-5">
              {dayHoliday ? `Feiertag: ${dayHoliday}` : dayAbsence!.type === "SICK" ? "Krank gemeldet" : dayAbsence!.type === "VACATION" ? "Urlaub" : "Abwesend"}
            </p>
          )}

          <div className="grid md:grid-cols-2 md:divide-x md:divide-slate-100">
            <div className="border-b border-slate-100 p-4 md:border-b-0 md:p-5">
              <DayWork
                key={`${selected}-${dayWork?.start}-${dayWork?.end}-${dayWork?.breakMinutes}`}
                date={selected}
                isToday={selected === today}
                locked={dayLocked}
                booked={dayBooked}
                work={dayWork ? { start: dayWork.start, end: dayWork.end, breakMinutes: dayWork.breakMinutes } : undefined}
              />
            </div>
            <div className="grid content-start gap-2 p-4 md:p-5">
              <p className="text-[13px] font-medium text-slate-500">Projekte</p>
              {dayEntries.length > 0 ? (
                <ul className="-mt-1 divide-y divide-slate-100">
                  {dayEntries.map((e) => (
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
                </ul>
              ) : (
                <p className="text-[15px] text-slate-500">An diesem Tag ist noch nichts gebucht.</p>
              )}
              {dayLocked ? (
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500">
                  {selected > today
                    ? "Zeiten können erst am jeweiligen Tag erfasst werden."
                    : `Monat abgeschlossen – Korrekturen bis zum ${LOCK_DAY}. des Folgemonats, danach über die Geschäftsführung.`}
                </p>
              ) : (
                <div className="mt-1">
                  <QuickBook key={selected} date={selected} projects={activeProjects} recentIds={recentIds} remaining={remaining} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Wochenansichten nur auf großen Bildschirmen */}
        <section className="card hidden overflow-x-auto md:block">
          <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
            <h2 className="font-semibold">Woche nach Projekten</h2>
          </div>
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Projekt</th>
                {days.map((d) => (
                  <th key={d} className={`text-right! ${isWeekend(d) || holidayName(d) ? "bg-slate-50" : ""} ${d === selected ? "text-brand-700!" : ""}`} title={holidayName(d)}>
                    {weekdayShort(d)} {formatDateShort(d)}
                  </th>
                ))}
                <th className="text-right!">Summe</th>
              </tr>
            </thead>
            <tbody>
              {[...byProject.values()].map((r) => (
                <tr key={r.id}>
                  <td><span className="font-medium">{r.name}</span><span className="ml-2 text-xs text-slate-400">{r.category}</span></td>
                  {r.perDay.map((h, i) => (
                    <td key={i} className="text-right tabular-nums">{h ? formatNum(h) : <span className="text-slate-300">–</span>}</td>
                  ))}
                  <td className="text-right font-medium tabular-nums">{formatNum(r.sum)}</td>
                </tr>
              ))}
              {byProject.size === 0 && <tr><td colSpan={9} className="py-8 text-center text-slate-400">Diese Woche noch nichts gebucht.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="card hidden overflow-x-auto md:block">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-2">
            <h2 className="font-semibold">Arbeitszeit der Woche</h2>
            <span className="flex items-center gap-4 text-sm text-slate-600">
              <span>Netto: <b className="tabular-nums">{formatMinutes(netWeek)}</b></span>
              <a className="inline-flex items-center gap-1 text-brand-700 hover:underline" href={`/api/export?typ=arbeitszeit&von=${monday.slice(0, 7)}-01&bis=${sunday}`}>
                <Icon name="download" className="h-4 w-4" /> CSV
              </a>
            </span>
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

        {!can(user.role, "time.editAll") && (
          <p className="px-1 text-[12px] text-slate-500">
            Korrekturen sind bis zum {LOCK_DAY}. des Folgemonats möglich, danach ist der Monat abgeschlossen.
          </p>
        )}
      </div>
    </>
  );
}
