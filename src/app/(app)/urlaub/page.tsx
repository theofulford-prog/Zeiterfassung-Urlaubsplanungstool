import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, todayISO } from "@/lib/dates";
import { formatNum } from "@/lib/format";
import { carryoverFor, vacationBalance } from "@/lib/stats";
import { LeaveFields } from "@/components/leave-fields";
import { cancelLeave, requestLeave } from "@/app/actions/leave";
import { ActionForm } from "@/components/action-form";
import { PageHeader, Stat } from "@/components/page-header";
import { StatusBadge, TypeLabel } from "@/components/leave-badges";

export default async function UrlaubPage() {
  const user = await requireUser();
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const leaves = await prisma.leaveRequest.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
  });
  const bal = vacationBalance(user.vacationDaysPerYear, year, leaves, carryoverFor(user, year));

  return (
    <>
      <PageHeader title="Mein Urlaub" subtitle={`Urlaubskonto ${year}`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Anspruch" value={`${formatNum(bal.total)} Tage`} hint={bal.carryover ? `${bal.allowance} + ${formatNum(bal.carryover)} Resturlaub Vorjahr` : undefined} />
        <Stat label="Genommen / genehmigt" value={`${formatNum(bal.taken)} Tage`} />
        <Stat label="Beantragt (offen)" value={`${formatNum(bal.pending)} Tage`} />
        <Stat label="Verbleibend" value={`${formatNum(bal.remaining)} Tage`} tone={bal.remaining < 0 ? "warn" : "good"} />
      </div>

      <section className="card mb-6 p-5">
        <h2 className="mb-1 font-semibold">Abwesenheit eintragen</h2>
        <p className="mb-4 text-sm text-slate-500">
          Urlaub wird von der Geschäftsführung freigegeben. Krankmeldungen gelten sofort – wirst du im Urlaub krank, trag es einfach ein, die Tage werden dir gutgeschrieben.
          Wochenenden und Feiertage (NRW) werden nicht mitgezählt.
        </p>
        <ActionForm action={requestLeave} submitLabel="Eintragen" className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_2fr]">
          <LeaveFields />
        </ActionForm>
      </section>

      <section className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Zeitraum</th><th>Art</th><th className="text-right!">Arbeitstage</th><th>Status</th><th>Notiz</th><th></th></tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{formatDate(l.startDate)} – {formatDate(l.endDate)}</td>
                <td><TypeLabel type={l.type} /></td>
                <td className="text-right tabular-nums">{formatNum(l.days)}{l.halfDay && <span className="ml-1 text-xs text-slate-400">(½)</span>}</td>
                <td><StatusBadge status={l.status} /></td>
                <td className="text-slate-500">{l.note}</td>
                <td className="text-right">
                  {l.status === "PENDING" && (
                    <form action={cancelLeave}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="btn-danger px-2! py-1! text-xs">Zurückziehen</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {leaves.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-400">Noch keine Einträge.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
