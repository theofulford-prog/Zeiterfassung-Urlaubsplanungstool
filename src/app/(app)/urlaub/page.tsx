import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRange, todayISO } from "@/lib/dates";
import { formatNum } from "@/lib/format";
import { employmentVacationBalance } from "@/lib/stats";
import { loadEmployments } from "@/lib/people";
import { LeaveFields } from "@/components/leave-fields";
import { cancelLeave, requestLeave } from "@/app/actions/leave";
import { ActionForm } from "@/components/action-form";
import { Disclosure } from "@/components/disclosure";
import { PageHeader } from "@/components/page-header";
import { StatStrip } from "@/components/stat-strip";
import { StatusBadge, TypeLabel } from "@/components/leave-badges";

type Leave = Awaited<ReturnType<typeof prisma.leaveRequest.findMany>>[number];

export default async function UrlaubPage() {
  const user = await requireUser();
  const today = todayISO();
  const year = Number(today.slice(0, 4));
  const [leaves, employmentMap] = await Promise.all([
    prisma.leaveRequest.findMany({ where: { userId: user.id }, orderBy: { startDate: "desc" } }),
    loadEmployments([user.id]),
  ]);
  // Ein Urlaubskonto je Arbeitsverhältnis, das in diesem Jahr besteht
  const accounts = (employmentMap.get(user.id) ?? [])
    .filter((e) => e.startDate <= `${year}-12-31` && (!e.endDate || e.endDate >= `${year}-01-01`))
    .map((e) => ({ id: e.id, company: e.company.name, bal: employmentVacationBalance(e, year, leaves) }));
  const upcoming = leaves.filter((l) => l.endDate >= today).reverse();
  const past = leaves.filter((l) => l.endDate < today);

  return (
    <>
      <PageHeader title="Mein Urlaub" subtitle={`Urlaubskonto ${year}`} />
      <div className="grid gap-3 md:gap-4">
        {accounts.length === 0 && (
          <p className="card px-4 py-5 text-[15px] text-slate-500">Für {year} ist kein Arbeitsverhältnis erfasst – daher gibt es kein Urlaubskonto.</p>
        )}
        {accounts.map(({ id, company, bal }) => (
          <div key={id} className="grid gap-1.5">
            {accounts.length > 1 && <h2 className="px-1 text-[13px] font-semibold text-slate-500">{company}</h2>}
            <StatStrip
              items={[
                { label: "Verbleibend", value: `${formatNum(bal.remaining)} Tage`, tone: bal.remaining < 0 ? "warn" : "good" },
                { label: "Anspruch", value: `${formatNum(bal.total)} Tage`, hint: bal.carryover ? `inkl. ${formatNum(bal.carryover)} Resturlaub` : undefined },
                { label: "Genommen", value: `${formatNum(bal.taken)} Tage` },
                { label: "Beantragt", value: `${formatNum(bal.pending)} Tage`, tone: bal.pending ? "warn" : undefined },
              ]}
            />
          </div>
        ))}

        <Disclosure label="Urlaub oder Krankheit eintragen" title="Abwesenheit eintragen">
          <p className="mb-4 text-[13px] text-slate-500">
            Urlaub gibt die Geschäftsführung frei. Krankmeldungen gelten sofort – wirst du im Urlaub krank, trag es ein, die Tage werden gutgeschrieben.
            Wochenenden und Feiertage (NRW) zählen nicht mit.
          </p>
          <ActionForm action={requestLeave} submitLabel="Eintragen" className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_2fr]">
            <LeaveFields />
          </ActionForm>
        </Disclosure>

        <LeaveList title="Anstehend" leaves={upcoming} empty="Nichts geplant." />
        {past.length > 0 && <LeaveList title="Vergangen" leaves={past} muted />}
      </div>
    </>
  );
}

function LeaveList({ title, leaves, empty, muted }: { title: string; leaves: Leave[]; empty?: string; muted?: boolean }) {
  return (
    <section>
      <h2 className="mb-1.5 px-1 text-[13px] font-semibold text-slate-500">{title}</h2>
      <ul className="card divide-y divide-slate-100">
        {leaves.map((l) => (
          <li key={l.id} className={`flex items-center gap-3 px-4 py-3 ${muted ? "opacity-70" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium tabular-nums">{formatRange(l.startDate, l.endDate)}</p>
              <p className="text-[13px] text-slate-500">
                <TypeLabel type={l.type} /> · {formatNum(l.days)} {l.days === 1 ? "Tag" : "Tage"}
                {l.halfDay && " (halber Tag)"}
                {l.note && ` · ${l.note}`}
              </p>
            </div>
            <StatusBadge status={l.status} />
            {l.status === "PENDING" && (
              <form action={cancelLeave}>
                <input type="hidden" name="id" value={l.id} />
                <button className="btn-danger min-h-10 px-2! text-[13px]">Zurückziehen</button>
              </form>
            )}
          </li>
        ))}
        {leaves.length === 0 && <li className="px-4 py-6 text-center text-[15px] text-slate-500">{empty}</li>}
      </ul>
    </section>
  );
}
