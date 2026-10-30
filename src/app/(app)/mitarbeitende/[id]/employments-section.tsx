import type { Company, Employment, EmploymentTerms } from "@prisma/client";
import { addTerms, deleteTerms, saveEmployment } from "@/app/actions/employment";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { Disclosure } from "@/components/disclosure";
import { formatDate, todayISO } from "@/lib/dates";
import { CONTRACT_TYPES, formatWorkDays, isEmployedOn } from "@/lib/employment";
import { formatEUR, formatNum } from "@/lib/format";
import { termsOn } from "@/lib/terms";

type Emp = Employment & { company: Company; terms: EmploymentTerms[] };

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function describeTerms(t: EmploymentTerms): string {
  const parts = [
    t.weeklyHours === null ? "kein Soll" : `${formatNum(t.weeklyHours)} h/Woche`,
    formatWorkDays(t.workDays),
    `${formatNum(t.vacationDaysPerYear)} Urlaubstage`,
  ];
  if (t.payAmount !== null) parts.push(t.payType === "HOURLY" ? `${formatEUR(t.payAmount)}/h` : `${formatEUR(t.payAmount)}/Monat`);
  parts.push(`Kostensatz ${formatEUR(t.costRate)}/h`);
  return parts.join(" · ");
}

function TermsFields({ prefix, terms, withValidFrom }: { prefix: string; terms?: EmploymentTerms | null; withValidFrom: boolean }) {
  const days = terms?.workDays ?? [1, 2, 3, 4, 5];
  return (
    <>
      {withValidFrom && (
        <div>
          <label className="label" htmlFor={`${prefix}-validFrom`}>Gültig ab</label>
          <input className="input" type="date" id={`${prefix}-validFrom`} name="validFrom" defaultValue={todayISO()} required />
        </div>
      )}
      <div>
        <label className="label" htmlFor={`${prefix}-weeklyHours`}>Wochenstunden</label>
        <input className="input" id={`${prefix}-weeklyHours`} name="weeklyHours" inputMode="decimal" defaultValue={terms ? terms.weeklyHours ?? "" : 40} placeholder="leer = kein Soll" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="label">Arbeitstage</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((label, i) => (
            <label key={label} className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[15px]">
              <input type="checkbox" name="workDays" value={i + 1} defaultChecked={days.includes(i + 1)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label className="label" htmlFor={`${prefix}-vacation`}>Urlaubstage pro Jahr</label>
        <input className="input" id={`${prefix}-vacation`} name="vacationDaysPerYear" inputMode="decimal" defaultValue={terms?.vacationDaysPerYear ?? 30} />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-payType`}>Vergütung</label>
        <div className="grid grid-cols-2 gap-2">
          <select className="input" id={`${prefix}-payType`} name="payType" defaultValue={terms?.payType ?? "MONTHLY"}>
            <option value="MONTHLY">Monatsgehalt €</option>
            <option value="HOURLY">Stundenlohn €</option>
          </select>
          <input className="input" name="payAmount" inputMode="decimal" aria-label="Betrag brutto" defaultValue={terms?.payAmount ?? ""} placeholder="brutto" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-costRate`}>Interner Kostensatz €/h</label>
        <input className="input" id={`${prefix}-costRate`} name="costRate" inputMode="decimal" defaultValue={terms?.costRate || ""} placeholder="z. B. 45" />
      </div>
    </>
  );
}

function EmploymentFields({ prefix, emp, companies }: { prefix: string; emp?: Emp; companies: Company[] }) {
  const options = companies.filter((c) => c.active || c.id === emp?.companyId);
  return (
    <>
      <div>
        <label className="label" htmlFor={`${prefix}-company`}>Gesellschaft</label>
        <select className="input" id={`${prefix}-company`} name="companyId" defaultValue={emp?.companyId ?? ""} required>
          <option value="" disabled>Bitte wählen</option>
          {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-type`}>Vertragsart</label>
        <select className="input" id={`${prefix}-type`} name="contractType" defaultValue={emp?.contractType ?? "PERMANENT"}>
          {Object.entries(CONTRACT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-job`}>Tätigkeit (optional)</label>
        <input className="input" id={`${prefix}-job`} name="jobTitle" defaultValue={emp?.jobTitle ?? ""} placeholder="z. B. Handwerker" />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-pnr`}>Personalnummer (optional)</label>
        <input className="input" id={`${prefix}-pnr`} name="personnelNumber" defaultValue={emp?.personnelNumber ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-start`}>Eintritt</label>
        <input className="input" type="date" id={`${prefix}-start`} name="startDate" defaultValue={emp?.startDate ?? ""} required />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-end`}>Letzter Arbeitstag (optional)</label>
        <input className="input" type="date" id={`${prefix}-end`} name="endDate" defaultValue={emp?.endDate ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-probation`}>Probezeit bis (optional)</label>
        <input className="input" type="date" id={`${prefix}-probation`} name="probationEndDate" defaultValue={emp?.probationEndDate ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-fixed`}>Befristet bis (optional)</label>
        <input className="input" type="date" id={`${prefix}-fixed`} name="fixedTermEndDate" defaultValue={emp?.fixedTermEndDate ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor={`${prefix}-carry`}>Resturlaub (Tage)</label>
          <input className="input" id={`${prefix}-carry`} name="carryoverDays" inputMode="decimal" defaultValue={emp?.carryoverDays || ""} placeholder="0" />
        </div>
        <div>
          <label className="label" htmlFor={`${prefix}-carryYear`}>gilt für Jahr</label>
          <input className="input" id={`${prefix}-carryYear`} name="carryoverYear" inputMode="numeric" defaultValue={emp?.carryoverYear ?? new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}

/** Arbeitsverhältnisse einer Person mit Konditionen-Historie. Nur mit Recht „personnel.view“ eingebunden. */
export function EmploymentsSection({ userId, employments, companies, canEdit }: {
  userId: string;
  employments: Emp[];
  companies: Company[];
  canEdit: boolean;
}) {
  const today = todayISO();
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 font-semibold">Arbeitsverhältnisse</h2>
      <div className="grid gap-4">
        {employments.map((e) => {
          const current = termsOn(e.terms, today) ?? termsOn(e.terms, e.startDate) ?? e.terms[0] ?? null;
          const history = [...e.terms].sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1));
          const active = isEmployedOn(e, today);
          return (
            <article key={e.id} className={`card p-4 md:p-5 ${active || e.startDate > today ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[16px] font-semibold">{e.company.name}</h3>
                <span className="text-[13px] text-slate-500">
                  {CONTRACT_TYPES[e.contractType as keyof typeof CONTRACT_TYPES] ?? e.contractType}
                  {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                  {e.personnelNumber ? ` · Nr. ${e.personnelNumber}` : ""}
                </span>
              </div>
              <p className="mt-1 text-[14px]">
                {e.endDate ? `${formatDate(e.startDate)} – ${formatDate(e.endDate)}` : `seit ${formatDate(e.startDate)}`}
                {e.startDate > today && " · beginnt künftig"}
                {e.endDate && e.endDate < today && " · beendet"}
                {e.probationEndDate && ` · Probezeit bis ${formatDate(e.probationEndDate)}`}
                {e.fixedTermEndDate && ` · befristet bis ${formatDate(e.fixedTermEndDate)}`}
              </p>
              {current && <p className="mt-1 text-[14px] text-slate-600">{describeTerms(current)}</p>}

              <details className="mt-3">
                <summary className="cursor-pointer text-[14px] text-brand-700">Konditionen-Historie ({e.terms.length})</summary>
                <ul className="mt-2 divide-y divide-slate-100 text-[14px]">
                  {history.map((t, i) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span><b>ab {formatDate(t.validFrom)}</b> · {describeTerms(t)}</span>
                      {canEdit && i === 0 && history.length > 1 && (
                        <form action={deleteTerms}>
                          <input type="hidden" name="id" value={t.id} />
                          <ConfirmButton message={`Konditionen ab ${formatDate(t.validFrom)} entfernen?`} className="text-[13px] text-red-600">
                            Entfernen
                          </ConfirmButton>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </details>

              {canEdit && (
                <>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[14px] text-brand-700">Konditionen ändern ab …</summary>
                    <ActionForm action={addTerms} submitLabel="Neue Konditionen speichern" className="mt-3 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="employmentId" value={e.id} />
                      <TermsFields prefix={`t-${e.id}`} terms={current} withValidFrom />
                    </ActionForm>
                  </details>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[14px] text-brand-700">Arbeitsverhältnis bearbeiten oder beenden</summary>
                    <ActionForm action={saveEmployment} submitLabel="Änderungen speichern" className="mt-3 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="id" value={e.id} />
                      <EmploymentFields prefix={`e-${e.id}`} emp={e} companies={companies} />
                    </ActionForm>
                  </details>
                </>
              )}
            </article>
          );
        })}
        {employments.length === 0 && (
          <p className="card px-4 py-5 text-[15px] text-slate-500">Noch kein Arbeitsverhältnis erfasst.</p>
        )}
        {canEdit && (
          <Disclosure label="Arbeitsverhältnis hinzufügen" title="Arbeitsverhältnis hinzufügen">
            <ActionForm action={saveEmployment} submitLabel="Arbeitsverhältnis anlegen" className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="userId" value={userId} />
              <EmploymentFields prefix="neu" companies={companies} />
              <p className="text-[13px] font-semibold sm:col-span-2">Konditionen ab Eintritt</p>
              <TermsFields prefix="neu-t" withValidFrom={false} />
            </ActionForm>
          </Disclosure>
        )}
      </div>
    </section>
  );
}
