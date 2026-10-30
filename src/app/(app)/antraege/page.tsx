import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatRange, todayISO } from "@/lib/dates";
import { formatNum } from "@/lib/format";
import { carryoverFor, vacationBalance } from "@/lib/stats";
import { cancelLeave, createLeaveForUser, decideLeave } from "@/app/actions/leave";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Disclosure } from "@/components/disclosure";
import { Icon } from "@/components/icons";
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

      <section className="card mb-4 md:mb-6">
        <h2 className="border-b border-slate-100 px-4 py-3 font-semibold md:px-5">Offen ({pending.length})</h2>
        <ul className="divide-y divide-slate-100">
          {pending.map((l) => {
            // Bei Anträgen über den Jahreswechsel das Konto beider Jahre zeigen.
            const years = [...new Set([Number(l.startDate.slice(0, 4)), Number(l.endDate.slice(0, 4))])];
            const balances = years.map((y) => ({ y, b: vacationBalance(l.user.vacationDaysPerYear, y, l.user.leaveRequests, carryoverFor(l.user, y)) }));
            const overlaps = approved.filter((a) => a.userId !== l.userId && a.startDate <= l.endDate && a.endDate >= l.startDate);
            return (
              <li key={l.id} className="grid gap-3 px-4 py-4 md:flex md:items-center md:gap-4 md:px-5">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium">
                    {l.user.name} · <TypeLabel type={shownType(l.type)} />
                  </p>
                  <p className="text-[14px] text-slate-600 tabular-nums">
                    {formatRange(l.startDate, l.endDate)} · <b>{formatNum(l.days)} {l.days === 1 ? "Tag" : "Tage"}</b>
                  </p>
                  {l.type === "VACATION" && (
                    <p className="text-[13px] text-slate-500">
                      Danach noch {balances.map(({ y, b }) => `${formatNum(b.remaining)} Tage${balances.length > 1 ? ` (${y})` : ""}`).join(", ")} übrig
                    </p>
                  )}
                  {l.note && (showReasons || l.type !== "SICK") && <p className="text-[13px] text-slate-500">„{l.note}“</p>}
                  {overlaps.length > 0 && (
                    <p className="mt-1 text-[13px] text-amber-700">Gleichzeitig abwesend: {overlaps.map((o) => o.user.name).join(", ")}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 md:flex">
                  <form action={decideLeave} className="contents">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="decision" value="REJECTED" />
                    <button className="btn-secondary min-h-11 text-red-600">Ablehnen</button>
                  </form>
                  <form action={decideLeave} className="contents">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="decision" value="APPROVED" />
                    <button className="btn-primary min-h-11">Genehmigen</button>
                  </form>
                </div>
              </li>
            );
          })}
          {pending.length === 0 && <li className="px-5 py-8 text-center text-[15px] text-slate-500">Keine offenen Anträge.</li>}
        </ul>
      </section>

      <Disclosure label="Abwesenheit für eine Person eintragen" title="Abwesenheit für eine Person eintragen" className="mb-4 md:mb-6">
        <p className="mb-4 text-[13px] text-slate-500">z. B. wenn sich jemand telefonisch krank meldet. Wird sofort als genehmigt eingetragen.</p>
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
      </Disclosure>

      <section>
        <h2 className="mb-1.5 px-1 text-[13px] font-semibold text-slate-500">Zuletzt entschieden / eingetragen</h2>
        <ul className="card divide-y divide-slate-100">
          {recent.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium">{l.user.name}</p>
                <p className="text-[13px] text-slate-500 tabular-nums">
                  {formatRange(l.startDate, l.endDate)} · <TypeLabel type={shownType(l.type)} /> · {formatNum(l.days)} {l.days === 1 ? "Tag" : "Tage"}
                  {l.decidedBy ? ` · ${l.decidedBy.name}` : l.type === "SICK" ? (showReasons ? " · Krankmeldung" : " · selbst eingetragen") : ""}
                </p>
              </div>
              <StatusBadge status={l.status} />
              <form action={cancelLeave}>
                <input type="hidden" name="id" value={l.id} />
                <ConfirmButton
                  message={`Eintrag von ${l.user.name} (${formatRange(l.startDate, l.endDate)}) endgültig löschen? Das Urlaubskonto wird entsprechend angepasst.`}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Icon name="trash" className="h-[18px] w-[18px]" />
                  <span className="sr-only">Löschen</span>
                </ConfirmButton>
              </form>
            </li>
          ))}
          {recent.length === 0 && <li className="px-4 py-6 text-center text-[15px] text-slate-500">Noch nichts entschieden.</li>}
        </ul>
      </section>
    </>
  );
}
