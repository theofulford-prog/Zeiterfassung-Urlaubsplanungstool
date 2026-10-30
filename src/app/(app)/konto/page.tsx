import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { changePassword, logout } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";

export default async function KontoPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Mein Konto" subtitle={`${user.name} · ${user.email}`}>
        <form action={logout}><button className="btn-secondary">Abmelden</button></form>
      </PageHeader>
      <Link href="/profil" className="card mb-4 flex max-w-xl min-h-12 items-center justify-between px-5 py-3 text-[15px] text-brand-700">
        Mein Profil – Personalakte, Arbeitsverhältnisse, Protokoll <span aria-hidden>›</span>
      </Link>
      <section className="card max-w-xl p-5">
        <h2 className="mb-4 font-semibold">Passwort ändern</h2>
        <ActionForm action={changePassword} submitLabel="Passwort ändern" resetOnSuccess className="grid gap-3">
          <div>
            <label className="label" htmlFor="current">Aktuelles Passwort</label>
            <input className="input" id="current" name="current" type="password" autoComplete="current-password" required data-reset />
          </div>
          <div>
            <label className="label" htmlFor="next">Neues Passwort (mind. 8 Zeichen)</label>
            <input className="input" id="next" name="next" type="password" autoComplete="new-password" required data-reset />
          </div>
          <div>
            <label className="label" htmlFor="repeat">Neues Passwort wiederholen</label>
            <input className="input" id="repeat" name="repeat" type="password" autoComplete="new-password" required data-reset />
          </div>
        </ActionForm>
      </section>
    </>
  );
}
