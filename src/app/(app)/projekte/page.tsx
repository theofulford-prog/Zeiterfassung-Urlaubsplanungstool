import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatEUR, formatNum } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { BudgetBar } from "@/components/budget-bar";

export default async function ProjektePage() {
  const me = await requirePermission("projects.manage");
  const showCosts = can(me.role, "costs.view");
  const [projects, entries] = await Promise.all([
    prisma.project.findMany({ orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }] }),
    prisma.timeEntry.findMany({ select: { projectId: true, hours: true, costRate: true, date: true } }),
  ]);
  const agg = new Map<string, { hours: number; cost: number; last: string }>();
  for (const e of entries) {
    const a = agg.get(e.projectId) ?? { hours: 0, cost: 0, last: "" };
    a.hours += e.hours;
    a.cost += e.hours * e.costRate;
    if (e.date > a.last) a.last = e.date;
    agg.set(e.projectId, a);
  }

  return (
    <>
      <PageHeader title="Projekte & Themen" subtitle="Worauf Mitarbeitende ihre Zeit buchen">
        <Link className="btn-primary" href="/projekte/neu">+ Neues Projekt</Link>
      </PageHeader>
      <section className="card overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th>Projekt</th><th>Kategorie</th><th className="text-right!">Stunden gesamt</th>
              {showCosts && <th className="text-right!">Kosten gesamt</th>}{showCosts && <th className="w-48">Budget</th>}<th>Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const a = agg.get(p.id) ?? { hours: 0, cost: 0, last: "" };
              return (
                <tr key={p.id} className={p.active ? "" : "text-slate-400"}>
                  <td><Link className="font-medium hover:text-brand-700" href={`/projekte/${p.id}`}>{p.name}</Link></td>
                  <td>{p.category}</td>
                  <td className="text-right tabular-nums">{formatNum(a.hours)} h</td>
                  {showCosts && <td className="text-right tabular-nums">{formatEUR(a.cost)}</td>}
                  {showCosts && <td>{p.budget ? <BudgetBar used={a.cost} budget={p.budget} /> : <span className="text-xs text-slate-400">–</span>}</td>}
                  <td>
                    <span className={`badge ${p.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {p.active ? "Aktiv" : "Abgeschlossen"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {projects.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Noch keine Projekte angelegt.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
