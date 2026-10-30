import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can, DEFAULT_MATRIX, LOCKED, normalizeRole, PERMISSIONS, ROLE_INFO, ROLES, type Permission, type Role } from "@/lib/permissions";
import { lastPermissionChange } from "@/lib/rbac";
import { resetPermissions, savePermissions } from "@/app/actions/roles";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { PageHeader } from "@/components/page-header";

/** Übersicht des Rollen- und Rechtekonzepts: wer darf was, und wer hat welche Rolle. */
export default async function RollenPage() {
  const me = await requirePermission("reports.view");
  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true, passwordSetAt: true },
  });
  const perms = Object.entries(PERMISSIONS) as [Permission, string][];
  const editable = can(me.role, "roles.manage");
  const changed = await lastPermissionChange();
  const changedBy = changed?.updatedById ? await prisma.user.findUnique({ where: { id: changed.updatedById }, select: { name: true } }) : null;
  const isDefault = (r: Role, p: Permission) => DEFAULT_MATRIX[r].includes(p);
  const byRole = (r: string) => users.filter((u) => normalizeRole(u.role) === r);

  return (
    <>
      <PageHeader
        title="Rollen & Rechte"
        subtitle={`Deine Rolle: ${ROLE_INFO[normalizeRole(me.role)].label}. Rollen vergibst du auf der Seite der jeweiligen Person.`}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 md:mb-6 md:gap-4 lg:grid-cols-4">
        {ROLES.map((r) => (
          <section key={r} className="card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">{ROLE_INFO[r].label}</h2>
              <span className="text-[13px] text-slate-500 tabular-nums">{byRole(r).length}</span>
            </div>
            <p className="mt-1 text-[13px] leading-snug text-slate-500">{ROLE_INFO[r].description}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {byRole(r).map((u) => (
                <li key={u.id}>
                  <Link href={`/mitarbeitende/${u.id}`} className="badge bg-slate-100 text-slate-700 hover:bg-slate-200">
                    {u.name}
                    {!u.passwordSetAt && <span className="ml-1 text-amber-600">· eingeladen</span>}
                  </Link>
                </li>
              ))}
              {byRole(r).length === 0 && <li className="text-[13px] text-slate-400">niemand</li>}
            </ul>
          </section>
        ))}
      </div>

      <section className="card overflow-x-auto">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-2">
          <h2 className="font-semibold">Berechtigungen</h2>
          <p className="text-[13px] text-slate-500">
            {changed
              ? `Angepasst am ${changed.updatedAt.toLocaleDateString("de-DE")}${changedBy ? ` von ${changedBy.name}` : ""}`
              : "Standardrechte"}
            {editable && " · Haken setzen oder entfernen und speichern"}
          </p>
        </div>
        <Matrix editable={editable} perms={perms} isDefault={isDefault} />
        <div className="border-t border-slate-100 px-5 py-3 text-[13px] text-slate-500">
          Feste Regeln: Admins haben immer alle Rechte, und nur Admins vergeben Rollen. Wer Mitarbeitende verwalten darf, kann höchstens die
          eigene Rolle vergeben und nur Konten bis zur eigenen Stufe bearbeiten (Admin › Geschäftsführung › Leitung › Mitarbeiter:in).
          Niemand ändert die eigene Rolle, und es bleibt immer mindestens ein aktiver Admin. Startpasswörter müssen beim ersten Login geändert werden.
          {" "}<span className="text-slate-400">○ = abweichend vom Standard</span>
        </div>
      </section>
    </>
  );
}

function Matrix({
  editable, perms, isDefault,
}: { editable: boolean; perms: [Permission, string][]; isDefault: (r: Role, p: Permission) => boolean }) {
  const table = (
    <table className="data-table md:min-w-[720px]">
      <thead>
        <tr>
          <th>Recht</th>
          {ROLES.map((r) => <th key={r} className="text-center!">{ROLE_INFO[r].short}</th>)}
        </tr>
      </thead>
      <tbody>
        {perms.map(([p, label]) => (
          <tr key={p}>
            <td>{label}</td>
            {ROLES.map((r) => {
              const on = can(r, p);
              const fixed = r === "ADMIN" || LOCKED.adminOnly.includes(p);
              const differs = !fixed && on !== isDefault(r, p);
              return (
                <td key={r} className="text-center">
                  {editable && !fixed ? (
                    <label className="inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center gap-1">
                      <input
                        type="checkbox"
                        name={`${r}:${p}`}
                        defaultChecked={on}
                        className="h-[18px] w-[18px] cursor-pointer accent-brand-600"
                        aria-label={`${label} – ${ROLE_INFO[r].label}`}
                      />
                      {differs && <span className="text-[10px] text-slate-400" title="abweichend vom Standard">○</span>}
                    </label>
                  ) : on ? (
                    <span className="text-emerald-600" aria-label="ja" title={fixed ? "fest" : undefined}>✓</span>
                  ) : (
                    <span className="text-slate-300" aria-label="nein" title={fixed ? "fest" : undefined}>–</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
        <tr>
          <td>Eigene Zeiten, Arbeitszeit und Abwesenheiten erfassen, Teamkalender sehen</td>
          {ROLES.map((r) => <td key={r} className="text-center text-emerald-600" aria-label="ja" title="fest">✓</td>)}
        </tr>
      </tbody>
    </table>
  );
  if (!editable) return table;
  return (
    <>
      <ActionForm action={savePermissions} submitLabel="Rechte speichern" className="[&>div:last-child]:border-t [&>div:last-child]:border-slate-100 [&>div:last-child]:px-5 [&>div:last-child]:py-3">
        {table}
      </ActionForm>
      <form action={resetPermissions} className="px-5 pb-4">
        <ConfirmButton message="Alle Rollen auf die Standardrechte zurücksetzen?" className="btn-ghost px-0! text-[13px]">
          Auf Standard zurücksetzen
        </ConfirmButton>
      </form>
    </>
  );
}
