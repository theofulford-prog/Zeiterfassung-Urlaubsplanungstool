import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { addMonths, formatDate, monthLabelShort, monthStart, todayISO } from "@/lib/dates";
import { formatEUR, formatHours, formatNum, formatPct } from "@/lib/format";
import { PageHeader, Stat } from "@/components/page-header";
import { CumulativeCostChart, MonthlyHoursChart } from "@/components/charts";
import { ProjectForm } from "@/components/project-form";

export default async function ProjektDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("projects.manage");
  const showCosts = can(me.role, "costs.view");
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();
  const entries = await prisma.timeEntry.findMany({
    where: { projectId: id },
    include: { user: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const hours = entries.reduce((s, e) => s + e.hours, 0);
  const cost = entries.reduce((s, e) => s + e.hours * e.costRate, 0);

  // Monatsreihe vom ersten Buchungsmonat (max. 24 Monate) bis heute
  const thisMonth = monthStart(todayISO());
  const first = entries.length ? monthStart(entries[entries.length - 1].date) : thisMonth;
  let from = first < addMonths(thisMonth, -23) ? addMonths(thisMonth, -23) : first;
  if (from > addMonths(thisMonth, -5)) from = addMonths(thisMonth, -5);
  const months: string[] = [];
  for (let m = from; m <= thisMonth; m = addMonths(m, 1)) months.push(m);
  const before = entries.filter((e) => e.date < from).reduce((s, e) => s + e.hours * e.costRate, 0);
  let running = before;
  const cumData = months.map((m) => {
    const inMonth = entries.filter((e) => monthStart(e.date) === m);
    running += inMonth.reduce((s, e) => s + e.hours * e.costRate, 0);
    return { label: monthLabelShort(m), kumuliert: Math.round(running), stunden: inMonth.reduce((s, e) => s + e.hours, 0) };
  });

  const perUser = new Map<string, { hours: number; cost: number }>();
  for (const e of entries) {
    const a = perUser.get(e.user.name) ?? { hours: 0, cost: 0 };
    a.hours += e.hours;
    a.cost += e.hours * e.costRate;
    perUser.set(e.user.name, a);
  }

  return (
    <>
      <PageHeader title={project.name} subtitle={`${project.category}${project.description ? " · " + project.description : ""}`}>
        <a className="btn-secondary" href={`/api/export?projekt=${project.id}&von=${entries.length ? entries[entries.length - 1].date : todayISO()}&bis=${todayISO()}`}>CSV-Export</a>
        <Link className="btn-ghost" href="/projekte">← Alle Projekte</Link>
      </PageHeader>

      <div className={`mb-6 grid gap-4 ${showCosts ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
        <Stat label="Stunden gesamt" value={formatHours(hours)} />
        {!showCosts && <Stat label="Beteiligte Personen" value={String(perUser.size)} />}
        {showCosts && <>
        <Stat label="Personalkosten gesamt" value={formatEUR(cost)} />
        <Stat label="Budget" value={project.budget ? formatEUR(project.budget) : "–"} />
        <Stat
          label="Budget verbraucht"
          value={project.budget ? formatPct(cost / project.budget) : "–"}
          tone={project.budget ? (cost > project.budget * 0.85 ? "warn" : "good") : undefined}
          hint={project.budget ? `Rest ${formatEUR(project.budget - cost)}` : undefined}
        />
        </>}
      </div>

      <div className={`mb-6 grid gap-6 ${showCosts ? "lg:grid-cols-2" : ""}`}>
        {showCosts && (
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Kostenentwicklung (kumuliert)</h2>
            <CumulativeCostChart data={cumData} budget={project.budget} />
          </section>
        )}
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Stunden pro Monat</h2>
          <MonthlyHoursChart data={cumData} />
        </section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <section className="card overflow-x-auto">
          <h2 className="px-5 pt-4 pb-2 font-semibold">Nach Person</h2>
          <table className="data-table">
            <thead><tr><th>Person</th><th className="text-right!">Stunden</th>{showCosts && <th className="text-right!">Kosten</th>}</tr></thead>
            <tbody>
              {[...perUser.entries()].sort((a, b) => b[1].hours - a[1].hours).map(([n, a]) => (
                <tr key={n}><td>{n}</td><td className="text-right tabular-nums">{formatNum(a.hours)}</td>{showCosts && <td className="text-right tabular-nums">{formatEUR(a.cost)}</td>}</tr>
              ))}
              {perUser.size === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-400">Noch keine Buchungen.</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="card overflow-x-auto lg:col-span-2">
          <h2 className="px-5 pt-4 pb-2 font-semibold">Letzte Buchungen</h2>
          <table className="data-table">
            <thead><tr><th>Datum</th><th>Person</th><th className="text-right!">Std.</th><th>Notiz</th></tr></thead>
            <tbody>
              {entries.slice(0, 25).map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{formatDate(e.date)}</td>
                  <td className="whitespace-nowrap">{e.user.name}</td>
                  <td className="text-right tabular-nums">{formatNum(e.hours)}</td>
                  <td className="text-slate-500">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Projekt bearbeiten</h2>
        <ProjectForm project={project} showBudget={showCosts} />
      </section>
    </>
  );
}
