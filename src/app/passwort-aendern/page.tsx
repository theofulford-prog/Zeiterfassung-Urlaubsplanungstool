import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { homeFor } from "@/lib/permissions";
import { changePassword } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";

export const metadata = { title: "Passwort ändern – TeamZeit" };

/** Erzwungener Passwortwechsel nach dem ersten Login mit Startpasswort. */
export default async function PasswortAendernPage() {
  const user = await requireUser({ allowPasswordChange: true });
  if (!user.mustChangePassword) redirect(homeFor(user.role));
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[14px] bg-brand-600 text-2xl font-bold text-onaccent">T</div>
          <h1 className="text-[22px] font-bold tracking-tight">Eigenes Passwort festlegen</h1>
          <p className="mt-1 text-[15px] text-slate-500">
            Hallo {user.name.split(" ")[0]}, du hast dich mit einem Startpasswort angemeldet. Bitte lege jetzt dein eigenes Passwort fest.
          </p>
        </div>
        <div className="card p-6">
          <ActionForm action={changePassword} submitLabel="Passwort festlegen" className="grid gap-4">
            <input type="text" name="username" value={user.email ?? ""} autoComplete="username" readOnly hidden />
            <div>
              <label className="label" htmlFor="current">Startpasswort</label>
              <input className="input" id="current" name="current" type="password" autoComplete="current-password" required autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="next">Neues Passwort (mind. 8 Zeichen)</label>
              <input className="input" id="next" name="next" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div>
              <label className="label" htmlFor="repeat">Neues Passwort wiederholen</label>
              <input className="input" id="repeat" name="repeat" type="password" autoComplete="new-password" minLength={8} required />
            </div>
          </ActionForm>
        </div>
      </div>
    </main>
  );
}
