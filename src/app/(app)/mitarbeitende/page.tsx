import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can, normalizeRole, ROLE_INFO } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDate, todayISO } from "@/lib/dates";
import { formatEUR, formatNum } from "@/lib/format";
import { employmentVacationBalance } from "@/lib/stats";
import { activeEmploymentsOn, lastWorkingDay } from "@/lib/employment";
import { companyLabel, loadEmployments, type EmploymentFull } from "@/lib/people";
import { termsOn } from "@/lib/terms";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icons";

export default async function MitarbeitendePage() {
  const me = await requirePermission("reports.view");
  const showCosts = can(me.role, "costs.view");
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { leaveRequests: { where: { startDate: { lte: `${year}-12-31` }, endDate: { gte: `${year}-01-01` } } } },
  });
  const employmentMap = await loadEmployments(users.map((u) => u.id));
  // Kennzahlen je Person über alle heute bestehenden Arbeitsverhältnisse
  const summary = (u: (typeof users)[number]) => {
    const all = employmentMap.get(u.id) ?? [];
    const current = activeEmploymentsOn(all, today);
    const inYear = all.filter((e) => e.startDate <= `${year}-12-31` && (!e.endDate || e.endDate >= `${year}-01-01`));
    const bals = inYear.map((e) => employmentVacationBalance(e, year, u.leaveRequests));
    const terms = current.map((e) => termsOn(e.terms, today));
    return {
      all,
      companies: current.map(companyLabel).join(", "),
      weeklyHours: terms.reduce((s, t) => s + (t?.weeklyHours ?? 0), 0),
      rates: current.map((e, i) => ({ label: companyLabel(e), rate: terms[i]?.costRate ?? 0 })),
      remaining: bals.reduce((s, b) => s + b.remaining, 0),
      total: bals.reduce((s, b) => s + b.total, 0),
      pending: bals.reduce((s, b) => s + b.pending, 0),
    };
  };

  return (
    <>
      <PageHeader title="Mitarbeitende" subtitle={`Logins, Arbeitszeitmodell, Urlaubskonto ${year} und Kostensätze`}>
        {can(me.role, "users.manage") && <Link className="btn-primary w-full md:w-auto" href="/mitarbeitende/neu">+ Person anlegen</Link>}
      </PageHeader>
      {/* iPhone: Liste */}
      <ul className="card divide-y divide-slate-100 md:hidden">
        {users.map((u) => {
          const bal = summary(u);
          return (
            <li key={u.id}>
              <Link href={`/mitarbeitende/${u.id}`} className={`flex items-center gap-3 px-4 py-3 active:bg-slate-50 ${u.active ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-medium">
                    <span className="truncate">{u.name}</span>
                    <UserStatus u={u} employments={bal.all} />
                  </p>
                  <p className="truncate text-[13px] text-slate-500">
                    {ROLE_INFO[normalizeRole(u.role)].label}{bal.companies ? ` · ${bal.companies}` : ""} · {formatNum(bal.remaining)} Tage Urlaub übrig
                  </p>
                </div>
                <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            </li>
          );
        })}
      </ul>
      <section className="card hidden overflow-x-auto md:block">
        <table className="data-table min-w-[860px]">
          <thead>
            <tr>
              <th>Name</th><th>E-Mail</th><th>Rolle</th><th>Gesellschaft</th><th className="text-right!">Std./Woche</th>
              <th className="text-right!">Urlaub übrig</th>{showCosts && <th className="text-right!">Kostensatz</th>}<th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const bal = summary(u);
              return (
                <tr key={u.id} className={u.active ? "" : "text-slate-400"}>
                  <td className="font-medium"><Link className="hover:text-brand-700" href={`/mitarbeitende/${u.id}`}>{u.name}</Link><span className="ml-2"><UserStatus u={u} employments={bal.all} /></span></td>
                  <td className="text-slate-500">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === "EMPLOYEE" ? "bg-slate-100 text-slate-600" : "bg-brand-50 text-brand-700"}`}>
                      {ROLE_INFO[normalizeRole(u.role)].label}
                    </span>
                  </td>
                  <td className="text-slate-500">{bal.companies || "–"}</td>
                  <td className="text-right tabular-nums">{bal.companies ? formatNum(bal.weeklyHours) : "–"}</td>
                  <td className="text-right tabular-nums">
                    {formatNum(bal.remaining)} / {formatNum(bal.total)}
                    {bal.pending > 0 && <span className="ml-1 text-xs text-amber-600">({formatNum(bal.pending)} offen)</span>}
                  </td>
                  {showCosts && (
                    <td className="text-right tabular-nums">
                      {bal.rates.length === 0
                        ? "–"
                        : bal.rates.some((r) => !r.rate)
                          ? <span className="text-amber-600">fehlt</span>
                          : bal.rates.map((r) => `${formatEUR(r.rate)}/h`).join(" · ")}
                    </td>
                  )}
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

function UserStatus({ u, employments }: {
  u: { anonymizedAt: Date | null; active: boolean; passwordSetAt: Date | null };
  employments: EmploymentFull[];
}) {
  const exit = lastWorkingDay(employments);
  if (u.anonymizedAt) return <span className="badge bg-slate-100 text-slate-500">anonymisiert</span>;
  if (exit && exit < todayISO()) return <span className="badge bg-slate-100 text-slate-500">ausgetreten {formatDate(exit)}</span>;
  if (exit) return <span className="badge bg-amber-50 text-amber-700">Austritt {formatDate(exit)}</span>;
  if (!u.active) return <span className="badge bg-slate-100 text-slate-500">gesperrt</span>;
  if (!u.passwordSetAt) return <span className="badge bg-amber-50 text-amber-700">eingeladen</span>;
  return null;
}
