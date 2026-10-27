import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDate, todayISO } from "@/lib/dates";
import { formatNum } from "@/lib/format";
import { carryoverFor, vacationBalance } from "@/lib/stats";
import { cancelLeave, createLeaveForUser, decideLeave } from "@/app/actions/leave";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { LeaveFields } from "@/components/leave-fields";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, TypeLabel } from "@/components/leave-badges";

export default async function AntraegePage() {
  const me = await requirePermission("leave.approve");
  // Ohne Recht auf Abwesenheitsgründe wird Krankheit nur als "Abwesenheit" angezeigt, Notizen dazu ausgeblendet.
  const showReasons = can(me.role, "absence.reasons");
  const shownType = (t: string) => (showReasons || t !== "SICK" ? t : "OTHER");
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const [pending, recent, people] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { include: { leaveRequests: true } } },
      orderBy: { startDate: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { status: { not: "PENDING" }, endDate: { gte: `${year - 1}-12-01` } },
      include: { user: true, decidedBy: true },
      orderBy: { startDate: "desc" },
      take: 50,
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // Wer ist im gleichen Zeitraum schon weg?
  const approved = await prisma.leaveRequest.findMany({ where: { status: "APPROVED", endDate: { gte: today } }, include: { user: true } });

  return (
    <>
      <PageHeader title="Urlaubsanträge" subtitle="Freigeben oder ablehnen" />

      <section className="card mb-6">
        <h2 className="border-b border-slate-100 px-5 py-3 font-semibold">Offen ({pending.length})</h2>
        <ul className="divide-y divide-slate-100">
          {pending.map((l) => {
            // Bei Anträgen über den Jahreswechsel das Konto beider Jahre zeigen.
            const years = [...new Set([Number(l.startDate.slice(0, 4)), Number(l.endDate.slice(0, 4))])];
            const balances = years.map((y) => ({ y, b: vacationBalance(l.user.vacationDaysPerYear, y, l.user.leaveRequests, carryoverFor(l.user, y)) }));
            const overlaps = approved.filter((a) => a.userId !== l.userId && a.startDate <= l.endDate && a.endDate >= l.startDate);
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-60 flex-1">
                  <p className="font-medium">
                    {l.user.name} · <TypeLabel type={shownType(l.type)} />
                  </p>
                  <p className="text-sm text-slate-600">
                    {formatDate(l.startDate)} – {formatDate(l.endDate)} · <b>{formatNum(l.days)} Arbeitstage</b>
                    {l.type === "VACATION" && (
                      <> · danach noch {balances.map(({ y, b }) => `${formatNum(b.remaining)} Tage${balances.length > 1 ? ` (${y})` : ""}`).join(", ")} übrig</>
                    )}
                  </p>
                  {l.note && (showReasons || l.type !== "SICK") && <p className="text-sm text-slate-500">„{l.note}“</p>}
                  {overlaps.length > 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Gleichzeitig abwesend: {overlaps.map((o) => o.user.name).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <form action={decideLeave}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="decision" value="REJECTED" />
                    <button className="btn-danger">Ablehnen</button>
                  </form>
                  <form action={decideLeave}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="decision" value="APPROVED" />
                    <button className="btn-tinted">Genehmigen</button>
                  </form>
                </div>
              </li>
            );
          })}
          {pending.length === 0 && <li className="px-5 py-8 text-center text-sm text-slate-400">Keine offenen Anträge. 🎉</li>}
        </ul>
      </section>

      <section className="card mb-6 p-5">
        <h2 className="mb-1 font-semibold">Abwesenheit für eine Person eintragen</h2>
        <p className="mb-4 text-sm text-slate-500">z. B. wenn sich jemand telefonisch krank meldet. Wird sofort als genehmigt eingetragen.</p>
        <ActionForm action={createLeaveForUser} submitLabel="Eintragen" className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr_1.5fr]">
          <div>
            <label className="label" htmlFor="userId">Person</label>
            <select className="input" id="userId" name="userId" required defaultValue="">
              <option value="" disabled>Bitte wählen …</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <LeaveFields />
        </ActionForm>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="px-5 pt-4 pb-2 font-semibold">Zuletzt entschieden / eingetragen</h2>
        <table className="data-table min-w-[680px]">
          <thead><tr><th>Person</th><th>Art</th><th>Zeitraum</th><th className="text-right!">Tage</th><th>Status</th><th>durch</th><th></th></tr></thead>
          <tbody>
            {recent.map((l) => (
              <tr key={l.id}>
                <td className="font-medium">{l.user.name}</td>
                <td><TypeLabel type={shownType(l.type)} /></td>
                <td className="whitespace-nowrap">{formatDate(l.startDate)} – {formatDate(l.endDate)}</td>
                <td className="text-right tabular-nums">{formatNum(l.days)}</td>
                <td><StatusBadge status={l.status} /></td>
                <td className="text-slate-500">{l.decidedBy?.name ?? (l.type === "SICK" ? (showReasons ? "Krankmeldung" : "selbst eingetragen") : "–")}</td>
                <td className="text-right">
                  <form action={cancelLeave}>
                    <input type="hidden" name="id" value={l.id} />
                    <ConfirmButton
                      message={`Eintrag von ${l.user.name} (${formatDate(l.startDate)} – ${formatDate(l.endDate)}) endgültig löschen? Das Urlaubskonto wird entsprechend angepasst.`}
                      className="btn-danger px-2! py-1! text-xs"
                    >
                      Löschen
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
