import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayISO } from "@/lib/dates";
import { saveCompany } from "@/app/actions/companies";
import { ActionForm } from "@/components/action-form";
import { Disclosure } from "@/components/disclosure";
import { PageHeader } from "@/components/page-header";

type C = { id: string; name: string; shortName: string | null; active: boolean };

function CompanyFields({ company }: { company?: C }) {
  const key = company?.id ?? "neu";
  return (
    <>
      {company && <input type="hidden" name="id" value={company.id} />}
      <div>
        <label className="label" htmlFor={`name-${key}`}>Name</label>
        <input className="input" id={`name-${key}`} name="name" defaultValue={company?.name} placeholder="z. B. DBS Home GmbH" required data-reset={company ? undefined : ""} />
      </div>
      <div>
        <label className="label" htmlFor={`short-${key}`}>Kurzname (optional)</label>
        <input className="input" id={`short-${key}`} name="shortName" defaultValue={company?.shortName ?? ""} placeholder="z. B. DBS Home" data-reset={company ? undefined : ""} />
      </div>
      {company && (
        <div>
          <label className="label" htmlFor={`active-${key}`}>Status</label>
          <select className="input" id={`active-${key}`} name="active" defaultValue={company.active ? "on" : "off"}>
            <option value="on">Aktiv – für neue Arbeitsverhältnisse wählbar</option>
            <option value="off">Inaktiv – nicht mehr wählbar</option>
          </select>
        </div>
      )}
    </>
  );
}

export default async function GesellschaftenPage() {
  await requirePermission("companies.manage");
  const today = todayISO();
  const [companies, active] = await Promise.all([
    prisma.company.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.employment.groupBy({
      by: ["companyId"],
      where: { startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
      _count: { _all: true },
    }),
  ]);
  const count = new Map(active.map((a) => [a.companyId, a._count._all]));

  return (
    <>
      <PageHeader title="Gesellschaften" subtitle="Arbeitgeber der Gruppe – jede Person ist bei einer oder mehreren angestellt" />
      <ul className="card mb-6 divide-y divide-slate-100">
        {companies.map((c) => (
          <li key={c.id} className={c.active ? "" : "opacity-60"}>
            <details className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium">{c.name}</span>
                  <span className="block text-[12px] text-slate-500">
                    {c.shortName ? `${c.shortName} · ` : ""}
                    {count.get(c.id) ?? 0} aktive Arbeitsverhältnisse{c.active ? "" : " · inaktiv"}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] text-brand-700 group-open:hidden">Bearbeiten</span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <ActionForm action={saveCompany} submitLabel="Änderungen speichern" className="grid gap-4 sm:grid-cols-3">
                  <CompanyFields company={c} />
                </ActionForm>
              </div>
            </details>
          </li>
        ))}
        {companies.length === 0 && <li className="px-4 py-6 text-center text-[15px] text-slate-500">Noch keine Gesellschaften angelegt.</li>}
      </ul>
      <Disclosure label="Gesellschaft hinzufügen" title="Gesellschaft hinzufügen">
        <ActionForm action={saveCompany} submitLabel="Gesellschaft anlegen" resetOnSuccess className="grid gap-4 sm:grid-cols-2">
          <CompanyFields />
        </ActionForm>
      </Disclosure>
    </>
  );
}
