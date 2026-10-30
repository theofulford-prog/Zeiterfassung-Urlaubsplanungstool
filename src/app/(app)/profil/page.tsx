import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, todayISO } from "@/lib/dates";
import { CONTRACT_TYPES, formatWorkDays } from "@/lib/employment";
import { formatEUR, formatNum } from "@/lib/format";
import { loadEmployments } from "@/lib/people";
import { maskedPersonal } from "@/lib/personal";
import { termsOn } from "@/lib/terms";
import { AuditList } from "@/components/audit-list";
import { PageHeader } from "@/components/page-header";
import { PersonalFacts } from "../mitarbeitende/[id]/personal-section";

/** Eigene Daten: Personalakte (nur lesen), Arbeitsverhältnisse und wer die eigenen Daten geändert oder angesehen hat. */
export default async function ProfilPage() {
  const user = await requireUser();
  const today = todayISO();
  const [record, employmentMap, entries, companies] = await Promise.all([
    prisma.personalRecord.findUnique({ where: { userId: user.id } }),
    loadEmployments([user.id]),
    prisma.auditLog.findMany({ where: { subjectUserId: user.id }, orderBy: { at: "desc" }, take: 50 }),
    prisma.company.findMany({ select: { id: true, name: true } }),
  ]);
  const employments = [...(employmentMap.get(user.id) ?? [])].reverse();
  const actorIds = [...new Set(entries.map((e) => e.actorId).filter((x): x is string => !!x))];
  const actors = new Map(
    (await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]),
  );

  return (
    <>
      <PageHeader title="Mein Profil" subtitle={`${user.name}${user.email ? ` · ${user.email}` : ""}`} />
      <div className="grid gap-4 md:gap-6">
        <section className="card p-4 md:p-5">
          <h2 className="mb-3 font-semibold">Meine Personalakte</h2>
          <PersonalFacts userId={user.id} record={record} masked={maskedPersonal(record)} />
          <p className="mt-3 text-[12px] text-slate-500">Stimmt etwas nicht? Bitte an die Personalabteilung wenden.</p>
        </section>

        <section className="card p-4 md:p-5">
          <h2 className="mb-3 font-semibold">Meine Arbeitsverhältnisse</h2>
          <ul className="grid gap-3">
            {employments.map((e) => {
              const t = termsOn(e.terms, today) ?? e.terms[e.terms.length - 1] ?? null;
              return (
                <li key={e.id} className="text-[14px]">
                  <p className="font-medium">{e.company.name} · {CONTRACT_TYPES[e.contractType as keyof typeof CONTRACT_TYPES] ?? e.contractType}</p>
                  <p className="text-slate-600">
                    {e.endDate ? `${formatDate(e.startDate)} – ${formatDate(e.endDate)}` : `seit ${formatDate(e.startDate)}`}
                    {t && ` · ${t.weeklyHours === null ? "ohne feste Stunden" : `${formatNum(t.weeklyHours)} h/Woche`} · ${formatWorkDays(t.workDays)} · ${formatNum(t.vacationDaysPerYear)} Urlaubstage`}
                    {t?.payAmount != null && ` · ${formatEUR(t.payAmount)}${t.payType === "HOURLY" ? "/h" : "/Monat"} brutto`}
                  </p>
                </li>
              );
            })}
            {employments.length === 0 && <li className="text-[14px] text-slate-500">Kein Arbeitsverhältnis erfasst.</li>}
          </ul>
        </section>

        <section className="card">
          <h2 className="px-4 pt-4 pb-2 font-semibold md:px-5">Wer hat meine Daten geändert oder angesehen</h2>
          <AuditList entries={entries} actors={actors} names={new Map(companies.map((c) => [c.id, c.name]))} empty="Noch keine Einträge." />
        </section>
      </div>
    </>
  );
}
