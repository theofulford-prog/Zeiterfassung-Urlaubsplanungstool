import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can, normalizeRole, ROLE_INFO } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDate, todayISO } from "@/lib/dates";
import { formatEUR, formatNum } from "@/lib/format";
import { carryoverFor, vacationBalance } from "@/lib/stats";
import { PageHeader } from "@/components/page-header";

export default async function MitarbeitendePage() {
  const me = await requirePermission("reports.view");
  const showCosts = can(me.role, "costs.view");
  const year = Number(todayISO().slice(0, 4));
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { leaveRequests: { where: { startDate: { lte: `${year}-12-31` }, endDate: { gte: `${year}-01-01` } } } },
  });

  return (
    <>
      <PageHeader title="Mitarbeitende" subtitle={`Logins, Arbeitszeitmodell, Urlaubskonto ${year} und Kostensätze`}>
        {can(me.role, "users.manage") && <Link className="btn-primary" href="/mitarbeitende/neu">+ Person anlegen</Link>}
      </PageHeader>
      <section className="card overflow-x-auto">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr>
              <th>Name</th><th>E-Mail</th><th>Rolle</th><th className="text-right!">Std./Woche</th>
              <th className="text-right!">Urlaub übrig</th>{showCosts && <th className="text-right!">Kostensatz</th>}<th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const bal = vacationBalance(u.vacationDaysPerYear, year, u.leaveRequests, carryoverFor(u, year));
              return (
                <tr key={u.id} className={u.active ? "" : "text-slate-400"}>
                  <td className="font-medium"><Link className="hover:text-brand-700" href={`/mitarbeitende/${u.id}`}>{u.name}</Link>{u.anonymizedAt ? <span className="badge ml-2 bg-slate-100 text-slate-500">anonymisiert</span>
                      : u.exitDate && u.exitDate < todayISO() ? <span className="badge ml-2 bg-slate-100 text-slate-500">ausgetreten {formatDate(u.exitDate)}</span>
                      : u.exitDate ? <span className="badge ml-2 bg-amber-50 text-amber-700">Austritt {formatDate(u.exitDate)}</span>
                      : !u.active ? <span className="badge ml-2 bg-slate-100 text-slate-500">gesperrt</span> : null}
                    {u.active && !u.passwordSetAt && <span className="badge ml-2 bg-amber-50 text-amber-700">eingeladen</span>}</td>
                  <td className="text-slate-500">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === "EMPLOYEE" ? "bg-slate-100 text-slate-600" : "bg-brand-50 text-brand-700"}`}>
                      {ROLE_INFO[normalizeRole(u.role)].label}
                    </span>
                  </td>
                  <td className="text-right tabular-nums">{formatNum(u.weeklyHours)}</td>
                  <td className="text-right tabular-nums">
                    {formatNum(bal.remaining)} / {formatNum(bal.total)}
                    {bal.pending > 0 && <span className="ml-1 text-xs text-amber-600">({formatNum(bal.pending)} offen)</span>}
                  </td>
                  {showCosts && <td className="text-right tabular-nums">{u.hourlyCost ? `${formatEUR(u.hourlyCost)}/h` : <span className="text-amber-600">fehlt</span>}</td>}
                  <td className="text-right"><Link className="btn-ghost px-2! py-1! text-xs" href={`/mitarbeitende/${u.id}`}>Details</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
