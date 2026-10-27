"use client";

import { useActionState, useState } from "react";
import { anonymizeUser, deleteUser } from "@/app/actions/admin";

/** Austritt abschließen: anonymisieren (empfohlen) oder endgültig löschen. */
export function UserDangerZone({ id, name, entries, anonymized }: { id: string; name: string; entries: number; anonymized: boolean }) {
  const [anonState, anonAction, anonPending] = useActionState(anonymizeUser, undefined);
  const [delState, delAction, delPending] = useActionState(deleteUser, undefined);
  const [typed, setTyped] = useState("");

  return (
    <section className="card mb-6 border-red-200/70 p-5">
      <h2 className="font-semibold">Person entfernen</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {!anonymized && (
          <form
            action={anonAction}
            onSubmit={(e) => {
              if (!window.confirm(`${name} anonymisieren? Name, E-Mail und Zugang werden entfernt. Das lässt sich nicht rückgängig machen.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={id} />
            <h3 className="text-[15px] font-semibold">Anonymisieren <span className="font-normal text-slate-500">– empfohlen</span></h3>
            <p className="mt-1 text-[13px] text-slate-500">
              Entfernt Name, E-Mail, Zugang und Notizen zu Abwesenheiten. Die {entries} Buchung(en) bleiben ohne Personenbezug erhalten –
              Projektkosten stimmen weiter, und die Aufbewahrungspflicht für Arbeitszeitnachweise (mind. 2 Jahre, § 16 ArbZG) bleibt erfüllt.
            </p>
            <button className="btn-secondary mt-3" disabled={anonPending}>{anonPending ? "Wird anonymisiert …" : "Anonymisieren"}</button>
            {anonState?.error && <p className="mt-2 text-[13px] text-red-600" role="alert">{anonState.error}</p>}
            {anonState?.ok && <p className="mt-2 text-[13px] text-emerald-700">{anonState.ok}</p>}
          </form>
        )}
        <form action={delAction}>
          <input type="hidden" name="id" value={id} />
          <h3 className="text-[15px] font-semibold text-red-600">Endgültig löschen</h3>
          <p className="mt-1 text-[13px] text-slate-500">
            Löscht die Person mit <b>allen {entries} Buchungen</b>, Arbeitszeiten und Abwesenheiten. Projektkosten sinken entsprechend.
            Gedacht für versehentlich angelegte Personen – nicht rückgängig zu machen.
          </p>
          <label className="label mt-3" htmlFor="confirmName">Zur Bestätigung Namen eingeben: <b className="text-slate-700">{name}</b></label>
          <div className="flex flex-wrap gap-2">
            <input id="confirmName" name="confirmName" className="input max-w-64" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            <button className="btn bg-red-600 text-onaccent hover:brightness-110" disabled={delPending || typed.trim() !== name}>
              {delPending ? "Wird gelöscht …" : "Endgültig löschen"}
            </button>
          </div>
          {delState?.error && <p className="mt-2 text-[13px] text-red-600" role="alert">{delState.error}</p>}
        </form>
      </div>
    </section>
  );
}
