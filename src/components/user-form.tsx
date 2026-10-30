import { saveUser } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { assignableRoles, normalizeRole, ROLE_INFO, ROLES } from "@/lib/permissions";

type U = { id: string; name: string; email: string | null; role: string; tracksTime: boolean; active: boolean; accessWithoutEmployment: boolean };

export function UserForm({ user, actorRole }: { user?: U; actorRole: string }) {
  const allowed = assignableRoles(actorRole);
  const current = user ? normalizeRole(user.role) : "EMPLOYEE";
  const roleOptions = ROLES.filter((r) => allowed.includes(r) || r === current);
  return (
    <ActionForm action={saveUser} submitLabel={user ? "Änderungen speichern" : "Person anlegen"} className="grid gap-4 sm:grid-cols-2">
      {user && <input type="hidden" name="id" value={user.id} />}
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input className="input" id="name" name="name" defaultValue={user?.name} required />
      </div>
      <div>
        <label className="label" htmlFor="email">E-Mail (Login, optional)</label>
        <input className="input" id="email" name="email" type="email" defaultValue={user?.email ?? ""} placeholder="leer = kein eigener Zugang" />
      </div>
      <div>
        <label className="label" htmlFor="tracksTime">Zeiterfassung</label>
        <select className="input" id="tracksTime" name="tracksTime" defaultValue={user?.tracksTime === false ? "off" : "on"}>
          <option value="on">Erfasst Arbeitszeit (erscheint in Auslastung)</option>
          <option value="off">Keine Zeiterfassung (z. B. Gesellschafter:in)</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="role">Rolle</label>
        <select className="input" id="role" name="role" defaultValue={current}>
          {roleOptions.map((r) => (
            <option key={r} value={r}>{ROLE_INFO[r].label}</option>
          ))}
        </select>
        <p className="mt-1 text-[12px] text-slate-500">
          Was welche Rolle darf: <a className="text-brand-700 underline" href="/rollen" target="_blank">Rollen &amp; Rechte</a>
        </p>
      </div>
      <div>
        <label className="label" htmlFor="password">
          {user ? "Passwort direkt setzen (optional)" : "Passwort (optional – besser: Einladungslink)"}
        </label>
        <input className="input" id="password" name="password" type="text" autoComplete="new-password" placeholder={user ? "leer lassen = unverändert" : "leer lassen = per Link einladen"} />
      </div>
      <label className="flex items-start gap-2 text-[14px] sm:col-span-2">
        <input type="checkbox" name="accessWithoutEmployment" className="mt-1" defaultChecked={user?.accessWithoutEmployment ?? false} />
        <span>
          Zugang ohne Arbeitsverhältnis
          <span className="block text-[12px] text-slate-500">z. B. Geschäftsführung ohne erfassten Vertrag oder externe Administration – Zugang endet dann nicht mit einem Austritt.</span>
        </span>
      </label>
      {user && (
        <div>
          <label className="label" htmlFor="active">Status</label>
          <select className="input" id="active" name="active" defaultValue={user.active ? "on" : "off"}>
            <option value="on">Aktiv</option>
            <option value="off">Gesperrt – kein Login</option>
          </select>
        </div>
      )}
      <p className="text-xs text-slate-500 sm:col-span-2">
        Eintritt, Austritt, Wochenstunden, Urlaub und Kostensatz stehen beim jeweiligen Arbeitsverhältnis.
      </p>
    </ActionForm>
  );
}
