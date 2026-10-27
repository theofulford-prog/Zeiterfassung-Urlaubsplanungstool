"use client";

import { useActionState, useState } from "react";
import { generateLink, revokeLinks } from "@/app/actions/invite";

type Props = {
  userId: string;
  name: string;
  email: string;
  registered: boolean;
  openUntil: string | null; // Ablauf eines offenen Links (ISO), falls vorhanden
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function InvitePanel({ userId, name, email, registered, openUntil }: Props) {
  const [state, action, pending] = useActionState(generateLink, undefined);
  const [copied, setCopied] = useState(false);
  const firstName = name.split(" ")[0];

  const mail = state?.url
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
        state.purpose === "RESET" ? "TeamZeit: Neues Passwort festlegen" : "Einladung zu TeamZeit",
      )}&body=${encodeURIComponent(
        state.purpose === "RESET"
          ? `Hallo ${firstName},\n\nüber diesen Link kannst du ein neues Passwort für TeamZeit festlegen:\n\n${state.url}\n\nDer Link ist bis ${fmt(state.expiresAt!)} gültig und funktioniert nur einmal.\n`
          : `Hallo ${firstName},\n\nab sofort erfassen wir Arbeitszeiten und Urlaub in TeamZeit. Über diesen Link legst du dein Passwort fest und bist direkt angemeldet:\n\n${state.url}\n\nDer Link ist bis ${fmt(state.expiresAt!)} gültig und funktioniert nur einmal. Danach meldest du dich mit ${email} an.\n\nTipp fürs iPhone: Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“.\n`,
      )}`
    : "";

  return (
    <section className="card mb-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{registered ? "Zugang" : "Einladung"}</h2>
          <p className="mt-0.5 text-[15px] text-slate-500">
            {registered
              ? "Die Person hat ihr Passwort selbst festgelegt. Bei Bedarf kannst du einen Link zum Zurücksetzen schicken."
              : openUntil
                ? `Einladung verschickt – Link gültig bis ${fmt(openUntil)}. Noch nicht angenommen.`
                : "Noch nicht eingeladen. Erzeuge einen Link und schicke ihn per E-Mail – die Person legt darüber ihr Passwort selbst fest."}
          </p>
        </div>
        <span className={`badge ${registered ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {registered ? "Aktiv" : openUntil ? "Eingeladen" : "Nicht eingeladen"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <form action={action}>
          <input type="hidden" name="userId" value={userId} />
          <button className={registered ? "btn-secondary" : "btn-primary"} disabled={pending}>
            {pending ? "Wird erzeugt …" : registered ? "Link zum Zurücksetzen erzeugen" : openUntil ? "Neuen Einladungslink erzeugen" : "Einladungslink erzeugen"}
          </button>
        </form>
        {openUntil && !state?.url && (
          <form action={revokeLinks}>
            <input type="hidden" name="userId" value={userId} />
            <button className="btn-danger">Offenen Link widerrufen</button>
          </form>
        )}
      </div>

      {state?.error && <p className="mt-3 text-[15px] text-red-600" role="alert">{state.error}</p>}
      {state?.url && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <label className="label" htmlFor="invite-url">Link für {name} – gültig bis {fmt(state.expiresAt!)}, nur einmal verwendbar</label>
          <div className="flex flex-wrap gap-2">
            <input id="invite-url" className="input min-w-0 flex-1 font-mono text-[13px]!" value={state.url} readOnly onFocus={(e) => e.target.select()} />
            <button
              type="button"
              className="btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(state.url!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Kopiert ✓" : "Kopieren"}
            </button>
            <a className="btn-primary" href={mail}>Per E-Mail senden</a>
          </div>
          <p className="mt-2 text-[13px] text-slate-500">„Per E-Mail senden“ öffnet dein Mailprogramm mit einem fertigen Text an {email}.</p>
        </div>
      )}
    </section>
  );
}
