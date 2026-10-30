import Link from "next/link";
import { findValidToken } from "@/lib/tokens";
import { AcceptForm } from "./accept-form";

export const metadata = { title: "Einladung – TeamZeit" };

export default async function EinladungPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = await findValidToken(token);
  const isReset = valid?.purpose === "RESET";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[14px] bg-brand-600 text-2xl font-bold text-onaccent">T</div>
          <h1 className="text-[22px] font-bold tracking-tight">
            {!valid ? "Link nicht mehr gültig" : isReset ? "Neues Passwort festlegen" : `Willkommen, ${valid.user.name.split(" ")[0]}!`}
          </h1>
          {valid && (
            <p className="mt-1 text-[15px] text-slate-500">
              {isReset ? "Lege ein neues Passwort für TeamZeit fest." : "Du wurdest zu TeamZeit eingeladen. Lege jetzt dein Passwort fest."}
            </p>
          )}
        </div>
        <div className="card p-6">
          {valid ? (
            <AcceptForm token={token} email={valid.user.email ?? ""} />
          ) : (
            <div className="space-y-4 text-[15px] text-slate-600">
              <p>Dieser Link ist abgelaufen oder wurde bereits verwendet. Bitte die Geschäftsführung, dir einen neuen Link zu schicken.</p>
              <Link href="/login" className="btn-secondary w-full">Zur Anmeldung</Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
