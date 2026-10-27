import { saveUser } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { assignableRoles, can, normalizeRole, ROLE_INFO, ROLES } from "@/lib/permissions";

type U = { id: string; name: string; email: string; role: string; hourlyCost: number; weeklyHours: number; tracksTime: boolean; entryDate: string | null; exitDate: string | null; vacationDaysPerYear: number; active: boolean; carryoverDays: number; carryoverYear: number | null };

export function UserForm({ user, actorRole }: { user?: U; actorRole: string }) {
  const allowed = assignableRoles(actorRole);
  const current = user ? normalizeRole(user.role) : "EMPLOYEE";
  const roleOptions = ROLES.filter((r) => allowed.includes(r) || r === current);
  const showCosts = can(actorRole, "costs.view");
  return (
    <ActionForm action={saveUser} submitLabel={user ? "Änderungen speichern" : "Person anlegen"} className="grid gap-4 sm:grid-cols-2">
      {user && <input type="hidden" name="id" value={user.id} />}
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input className="input" id="name" name="name" defaultValue={user?.name} required />
      </div>
      <div>
        <label className="label" htmlFor="email">E-Mail (Login)</label>
        <input className="input" id="email" name="email" type="email" defaultValue={user?.email} required />
      </div>
      <div>
        <label className="label" htmlFor="weeklyHours">Wochenstunden</label>
        <input className="input" id="weeklyHours" name="weeklyHours" inputMode="decimal" defaultValue={user?.weeklyHours ?? 40} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="entryDate">Eintritt</label>
          <input className="input" type="date" id="entryDate" name="entryDate" defaultValue={user?.entryDate ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="exitDate">Austritt (letzter Arbeitstag)</label>
          <input className="input" type="date" id="exitDate" name="exitDate" defaultValue={user?.exitDate ?? ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="tracksTime">Zeiterfassung</label>
        <select className="input" id="tracksTime" name="tracksTime" defaultValue={user?.tracksTime === false ? "off" : "on"}>
          <option value="on">Erfasst Arbeitszeit (erscheint in Auslastung)</option>
          <option value="off">Keine Zeiterfassung (z. B. Gesellschafter:in)</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="vacationDaysPerYear">Urlaubstage pro Jahr</label>
        <input className="input" id="vacationDaysPerYear" name="vacationDaysPerYear" inputMode="numeric" defaultValue={user?.vacationDaysPerYear ?? 30} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="carryoverDays">Resturlaub Vorjahr (Tage)</label>
          <input className="input" id="carryoverDays" name="carryoverDays" inputMode="decimal" defaultValue={user?.carryoverDays || ""} placeholder="0" />
        </div>
        <div>
          <label className="label" htmlFor="carryoverYear">gilt für Jahr</label>
          <input className="input" id="carryoverYear" name="carryoverYear" inputMode="numeric" defaultValue={user?.carryoverYear ?? new Date().getFullYear()} />
        </div>
      </div>
      {showCosts && (
        <div>
          <label className="label" htmlFor="hourlyCost">Interner Kostensatz €/h <span className="font-normal text-slate-400">– nur für GF/Admin sichtbar</span></label>
          <input className="input" id="hourlyCost" name="hourlyCost" inputMode="decimal" defaultValue={user?.hourlyCost ?? ""} placeholder="z. B. 45" />
        </div>
      )}
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
        Eintritt/Austritt begrenzen das Soll; nach dem Austritt ist kein Login mehr möglich, offene Anträge danach werden zurückgezogen.
        Änderungen am Kostensatz gelten für neue Buchungen (Stunden, die ohne Kostensatz gebucht wurden, werden beim ersten Setzen nachbewertet). Bereits gebuchte Stunden behalten ihren damaligen Satz, damit die Projektkosten nachvollziehbar bleiben.
      </p>
    </ActionForm>
  );
}
