"use client";

import { useActionState } from "react";
import { revealPersonalField, type SensitiveField } from "@/app/actions/personal";

/** Maskierter Wert mit „Anzeigen“ – der Klartext kommt erst auf Knopfdruck vom Server. */
export function RevealField({ userId, field, masked }: { userId: string; field: SensitiveField; masked: string | null }) {
  const [state, action, pending] = useActionState(revealPersonalField, undefined);
  if (!masked) return <span className="text-slate-400">–</span>;
  if (state?.value) return <span className="font-mono tabular-nums">{state.value}</span>;
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="field" value={field} />
      <span className="font-mono tabular-nums">{masked}</span>
      <button className="text-[13px] text-brand-700 underline-offset-2 hover:underline" disabled={pending}>
        {pending ? "…" : "Anzeigen"}
      </button>
      {state?.error && <span className="text-[13px] text-red-600">{state.error}</span>}
    </form>
  );
}
