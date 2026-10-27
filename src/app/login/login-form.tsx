"use client";

import { useActionState } from "react";
import { login } from "../actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-Mail</label>
        <input className="input" id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="password">Passwort</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Anmelden …" : "Anmelden"}
      </button>
      <p className="text-center text-[13px] text-slate-500">Passwort vergessen? Die Geschäftsführung schickt dir einen Link zum Zurücksetzen.</p>
    </form>
  );
}
