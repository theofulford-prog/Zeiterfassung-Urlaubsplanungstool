import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  addDays, addMonths, daysInRange, isWorkday, formatDateShort, isValidISO, monthEnd, monthLabel, monthLabelShort, monthStart, startOfWeek, todayISO,
} from "@/lib/dates";
import { formatEUR, formatHours, formatNum, formatPct, LEAVE_TYPES } from "@/lib/format";
import { employedOn, leaveWorkdaysIn, targetHoursFor, trackingStart } from "@/lib/stats";
import { PageHeader, Stat } from "@/components/page-header";
import { StackedCostChart, type StackedRow } from "@/components/charts";
import { BudgetBar } from "@/components/budget-bar";

export default async function UebersichtPage({ searchParams }: { searchParams: Promise<{ monat?: string }> }) {
  const me = await requirePermission("reports.view");
  // Ohne Kostenrecht (z. B. Teamleitung) werden überall Stunden statt Euro gezeigt.
  const showCosts = can(me.role, "costs.view");
  const showReasons = can(me.role, "absence.reasons");
  const v = (e: { hours: number; costRate: number }) => (showCosts ? e.hours * e.costRate : e.hours);
  const fmtV = (n: number) => (showCosts ? formatEUR(n) : formatHours(n));
  const { monat } = await searchParams;
  const today = todayISO();
  const start = monthStart(isValidISO(monat) ? monat : today);
  const end = monthEnd(start);
  const isCurrent = today >= start && today <= end;
  const targetEnd = isCurrent ? today : end;
  const chartStart = addMonths(start, -11);
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  // Fehlende Buchungen: die letzten 10 Arbeitstage bis gestern
  const checkDays = daysInRange(addDays(today, -16), addDays(today, -1)).filter(isWorkday).slice(-10);
  const [recentEntries, recentLeaves] = await Promise.all([
    prisma.timeEntry.findMany({ where: { date: { gte: checkDays[0] ?? today, lte: today } }, select: { userId: true, date: true } }),
    prisma.leaveRequest.findMany({ where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: checkDays[0] ?? today } } }),
  ]);

  const [rawUsers, entries, chartEntries, cumEntries, leaves, pending, upcoming] = await Promise.all([
    // Alle, die im Monat beschäftigt waren – auch wer inzwischen ausgetreten ist
    prisma.user.findMany({
      where: { tracksTime: true, anonymizedAt: null, OR: [{ active: true }, { exitDate: { gte: start } }] },
      orderBy: { name: "asc" },
    }),
    prisma.timeEntry.findMany({ where: { date: { gte: start, lte: end } }, include: { project: true } }),
    prisma.timeEntry.findMany({ where: { date: { gte: chartStart, lte: end } }, include: { project: true } }),
    prisma.timeEntry.findMany({ where: { date: { lte: end } }, select: { projectId: true, hours: true, costRate: true } }),
    prisma.leaveRequest.findMany({ where: { status: "APPROVED", startDate: { lte: end }, endDate: { gte: start } } }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.leaveRequest.findMany({
      where: { status: "APPROVED", startDate: { lte: weekEnd }, endDate: { gte: today } },
      include: { user: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  // Kosten kumuliert je Projekt (alle Zeit bis Monatsende)
  const cumCost = new Map<string, number>();
  for (const e of cumEntries) cumCost.set(e.projectId, (cumCost.get(e.projectId) ?? 0) + v(e));

  // Nur wer im gewählten Monat beschäftigt war (Eintritt bis Austritt)
  const users = rawUsers.filter((u) => trackingStart(u) <= end && (!u.exitDate || u.exitDate >= start));
  const booked = new Set(recentEntries.map((e) => `${e.userId}|${e.date}`));
  const missing = users
    .map((u) => ({
      u,
      days: checkDays.filter(
        (d) => employedOn(u, d) && u.active && !booked.has(`${u.id}|${d}`) && !recentLeaves.some((l) => l.userId === u.id && l.startDate <= d && l.endDate >= d),
      ),
    }))
    .filter((m) => m.days.length > 0)
    .sort((a, b) => b.days.length - a.days.length);
  const noRate = showCosts ? users.filter((u) => !u.hourlyCost) : [];

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const totalCost = entries.reduce((s, e) => s + v(e), 0);

  // Auslastung je Person
  const people = users.map((u) => {
    const mine = entries.filter((e) => e.userId === u.id);
    const ist = mine.reduce((s, e) => s + e.hours, 0);
    const istBis = mine.filter((e) => e.date <= targetEnd).reduce((s, e) => s + e.hours, 0);
    const myLeaves = leaves.filter((l) => l.userId === u.id);
    const soll = targetHoursFor(u, start, targetEnd, myLeaves);
    const absentDays = myLeaves.reduce((s, l) => s + leaveWorkdaysIn(l, start, end), 0);
    const perProject = new Map<string, number>();
    for (const e of mine) perProject.set(e.project.name, (perProject.get(e.project.name) ?? 0) + e.hours);
    const top = [...perProject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    return { u, ist, soll, util: soll > 0 ? istBis / soll : null, absentDays, top, cost: mine.reduce((s, e) => s + v(e), 0) };
  });
  const withTarget = people.filter((p) => p.util !== null);
  const avgUtil = withTarget.length ? withTarget.reduce((s, p) => s + p.util!, 0) / withTarget.length : 0;
  const overloaded = people.filter((p) => (p.util ?? 0) > 1.1).length;

  // Projekte im Monat
  const projMap = new Map<string, { id: string; name: string; category: string; budget: number | null; hours: number; cost: number }>();
  for (const e of entries) {
    const p = projMap.get(e.projectId) ?? { id: e.projectId, name: e.project.name, category: e.project.category, budget: e.project.budget, hours: 0, cost: 0 };
    p.hours += e.hours;
    p.cost += v(e);
    projMap.set(e.projectId, p);
  }
  const projRows = [...projMap.values()].sort((a, b) => b.cost - a.cost);
  const catMap = new Map<string, { hours: number; cost: number }>();
  for (const p of projRows) {
    const c = catMap.get(p.category) ?? { hours: 0, cost: 0 };
    c.hours += p.hours;
    c.cost += p.cost;
    catMap.set(p.category, c);
  }
  const categories = [...catMap.entries()].sort((a, b) => b[1].cost - a[1].cost);

  // Kostenentwicklung: Top-7-Projekte der 12 Monate, Rest = Sonstige
  const months = Array.from({ length: 12 }, (_, i) => addMonths(chartStart, i));
  const projTotals = new Map<string, number>();
  for (const e of chartEntries) projTotals.set(e.project.name, (projTotals.get(e.project.name) ?? 0) + v(e));
  const ranked = [...projTotals.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  const topNames = ranked.slice(0, 7);
  const series = ranked.length > 7 ? [...topNames, "Sonstige"] : topNames;
  const chartData: StackedRow[] = months.map((m) => {
    const row: StackedRow = { label: monthLabelShort(m) };
    series.forEach((_, i) => (row[`s${i}`] = 0));
    return row;
  });
  for (const e of chartEntries) {
    const idx = months.indexOf(monthStart(e.date));
    if (idx < 0) continue;
    const key = `s${series.indexOf(topNames.includes(e.project.name) ? e.project.name : "Sonstige")}`;
    chartData[idx][key] = Math.round(((chartData[idx][key] as number) + v(e)) * 100) / 100;
  }

  return (
    <>
      <PageHeader title="Übersicht" subtitle={monthLabel(start)}>
        <Link className="btn-secondary" href={`/uebersicht?monat=${addMonths(start, -1)}`}>←</Link>
        <Link className="btn-ghost" href="/uebersicht">Aktueller Monat</Link>
        <Link className="btn-secondary" href={`/uebersicht?monat=${addMonths(start, 1)}`}>→</Link>
        <details className="relative">
          <summary className="btn-secondary cursor-pointer list-none">Export ▾</summary>
          <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg">
            {[
              ["zeiten", showCosts ? "Projektzeiten & Kosten" : "Projektzeiten"],
              ["arbeitszeit", "Arbeitszeiten (Beginn/Ende/Pause)"],
              ...(showReasons ? [["abwesenheiten", "Urlaub & Abwesenheiten"]] : []),
            ].map(([t, l]) => (
              <a key={t} className="block rounded-md px-3 py-2 hover:bg-slate-50" href={`/api/export?typ=${t}&von=${start}&bis=${end}`}>
                {l} <span className="text-xs text-slate-400">· {monthLabel(start)}</span>
              </a>
            ))}
          </div>
        </details>
      </PageHeader>

      {(missing.length > 0 || noRate.length > 0) && (
        <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
          {missing.length > 0 && (
            <p>
              <b>Fehlende Buchungen</b> (letzte 10 Arbeitstage):{" "}
              {missing.map((m, i) => (
                <span key={m.u.id}>
                  {i > 0 && ", "}
                  <Link className="underline decoration-amber-300 hover:decoration-amber-700" href={`/mitarbeitende/${m.u.id}`}>{m.u.name}</Link>{" "}
                  ({m.days.length} {m.days.length === 1 ? "Tag" : "Tage"})
                </span>
              ))}
            </p>
          )}
          {noRate.length > 0 && (
            <p className={missing.length ? "mt-1" : ""}>
              <b>Kein Kostensatz hinterlegt:</b> {noRate.map((u) => u.name).join(", ")} – Projektkosten sind dadurch zu niedrig.
            </p>
          )}
        </section>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Erfasste Stunden" value={formatHours(totalHours)} hint={`${users.length} Personen mit Zeiterfassung`} />
        {showCosts ? (
          <Stat label="Personalkosten" value={formatEUR(totalCost)} hint="Stunden × interner Stundensatz" />
        ) : (
          <Stat label="Bebuchte Projekte" value={String(projRows.length)} hint="mit Stunden in diesem Monat" />
        )}
        <Stat
          label={`Ø Auslastung${isCurrent ? " (bis heute)" : ""}`}
          value={formatPct(avgUtil)}
          hint={overloaded ? `${overloaded} Person(en) über 110 %` : "niemand über 110 %"}
          tone={overloaded ? "warn" : undefined}
        />
        <Link href="/antraege" className="block">
          <Stat label="Offene Urlaubsanträge" value={String(pending)} hint="zur Freigabe →" tone={pending ? "warn" : undefined} />
        </Link>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="font-semibold">{showCosts ? "Personalkosten je Projekt" : "Stunden je Projekt"}</h2>
          <p className="mb-3 text-xs text-slate-500">Letzte 12 Monate · die 7 {showCosts ? "kostenintensivsten" : "zeitintensivsten"} Projekte, Rest als „Sonstige“</p>
          {series.length ? <StackedCostChart data={chartData} series={series} unit={showCosts ? "eur" : "hours"} /> : <p className="py-16 text-center text-sm text-slate-400">Noch keine Daten.</p>}
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold">Abwesend diese Woche</h2>
            <Link href="/kalender" className="text-xs text-brand-700 hover:underline">Kalender →</Link>
          </div>
          <ul className="space-y-2.5 text-sm">
            {upcoming.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{l.user.name}</span>
                <span className="text-right text-xs text-slate-500">
                  {showReasons ? LEAVE_TYPES[l.type] : "abwesend"} · {formatDateShort(l.startDate)}–{formatDateShort(l.endDate)}
                </span>
              </li>
            ))}
            {upcoming.length === 0 && <li className="text-slate-400">Alle an Bord.</li>}
          </ul>
        </section>
      </div>

      <section className="card mb-6 overflow-x-auto">
        <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
          <h2 className="font-semibold">Auslastung je Person</h2>
          <p className="text-xs text-slate-500">Soll{isCurrent ? " bis heute" : ""} = Arbeitstage × Wochenstunden/5, abzgl. Urlaub/Krankheit</p>
        </div>
        <table className="data-table min-w-[900px]">
          <thead>
            <tr>
              <th>Person</th>
              <th className="text-right!">Ist</th>
              <th className="text-right!">Soll</th>
              <th className="w-56">Auslastung</th>
              <th className="text-right!">Abwesend</th>
              {showCosts && <th className="text-right!">Kosten</th>}
              <th>Schwerpunkte</th>
            </tr>
          </thead>
          <tbody>
            {people.map(({ u, ist, soll, util, absentDays, top, cost }) => (
              <tr key={u.id}>
                <td className="font-medium whitespace-nowrap"><Link className="hover:text-brand-700" href={`/mitarbeitende/${u.id}`}>{u.name}</Link></td>
                <td className="text-right whitespace-nowrap tabular-nums">{formatNum(ist)} h</td>
                <td className="text-right whitespace-nowrap text-slate-500 tabular-nums">{formatNum(soll)} h</td>
                <td><UtilBar util={util} /></td>
                <td className="text-right text-slate-500 tabular-nums">{absentDays ? `${formatNum(absentDays)} T` : "–"}</td>
                {showCosts && <td className="text-right whitespace-nowrap tabular-nums">{formatEUR(cost)}</td>}
                <td className="max-w-64 text-xs text-slate-500">{top.map(([n]) => n).join(" · ") || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {categories.length > 0 && (
        <section className="card mb-6 p-5">
          <h2 className="mb-3 font-semibold">Wofür ging die Zeit drauf? <span className="text-sm font-normal text-slate-500">· {monthLabel(start)} nach Kategorie</span></h2>
          <div className="space-y-2">
            {categories.map(([cat, c]) => (
              <div key={cat} className="grid grid-cols-[8rem_1fr_6rem_6rem] items-center gap-3 text-sm">
                <span className="truncate font-medium">{cat}</span>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${totalCost ? (c.cost / totalCost) * 100 : 0}%` }} />
                </div>
                <span className="text-right text-slate-500 tabular-nums">{showCosts ? `${formatNum(c.hours)} h` : ""}</span>
                <span className="text-right tabular-nums">{fmtV(c.cost)} <span className="text-xs text-slate-400">({formatPct(totalCost ? c.cost / totalCost : 0)})</span></span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card overflow-x-auto">
        <h2 className="px-5 pt-4 pb-2 font-semibold">Projekte im {monthLabel(start)}</h2>
        <table className="data-table min-w-[680px]">
          <thead>
            <tr>
              <th>Projekt</th>
              <th>Kategorie</th>
              <th className="text-right!">Stunden</th>
              {showCosts && <th className="text-right!">Kosten Monat</th>}
              {showCosts && <th className="text-right!">Kosten gesamt</th>}
              {showCosts && <th className="w-48">Budget</th>}
            </tr>
          </thead>
          <tbody>
            {projRows.map((p) => {
              const cum = cumCost.get(p.id) ?? 0;
              return (
                <tr key={p.id}>
                  <td><Link className="font-medium hover:text-brand-700" href={`/projekte/${p.id}`}>{p.name}</Link></td>
                  <td className="text-slate-500">{p.category}</td>
                  <td className="text-right tabular-nums">{formatNum(p.hours)} h</td>
                  {showCosts && <td className="text-right tabular-nums">{formatEUR(p.cost)}</td>}
                  {showCosts && <td className="text-right tabular-nums">{formatEUR(cum)}</td>}
                  {showCosts && <td>{p.budget ? <BudgetBar used={cum} budget={p.budget} /> : <span className="text-xs text-slate-400">kein Budget</span>}</td>}
                </tr>
              );
            })}
            {projRows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Keine Buchungen in diesem Monat.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}

function UtilBar({ util }: { util: number | null }) {
  if (util === null) return <span className="text-xs text-slate-400">kein Soll</span>;
  const pct = Math.min(util, 1.5) / 1.5;
  const status = util > 1.1 ? { c: "bg-amber-500", t: "hoch" } : util < 0.8 ? { c: "bg-slate-400", t: "niedrig" } : { c: "bg-emerald-500", t: "" };
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${status.c}`} style={{ width: `${pct * 100}%` }} />
        <div className="absolute top-[-3px] h-3.5 w-px bg-slate-400" style={{ left: `${(1 / 1.5) * 100}%` }} title="100 %" />
      </div>
      <span className="w-20 text-right text-xs tabular-nums">
        {formatPct(util)}
        {status.t && <span className={`ml-1 ${util > 1.1 ? "text-amber-600" : "text-slate-400"}`}>{status.t}</span>}
      </span>
    </div>
  );
}
