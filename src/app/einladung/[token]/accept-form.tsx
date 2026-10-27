"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/app/actions/invite";

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptInvite, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {/* Für Passwort-Manager: Benutzername zum neuen Passwort */}
      <div>
        <label className="label" htmlFor="email">E-Mail</label>
        <input className="input" id="email" name="username" type="email" value={email} autoComplete="username" readOnly />
      </div>
      <div>
        <label className="label" htmlFor="password">Passwort (mind. 8 Zeichen)</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="repeat">Passwort wiederholen</label>
        <input className="input" id="repeat" name="repeat" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && <p className="text-[15px] text-red-600" role="alert">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Wird gespeichert …" : "Passwort festlegen"}</button>
    </form>
  );
}
