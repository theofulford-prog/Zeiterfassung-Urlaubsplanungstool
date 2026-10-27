"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/auth";

/** Formular mit Server-Action, Fehler-/Erfolgsmeldung und optionalem Zurücksetzen nach Erfolg. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  submitLabel,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) {
      ref.current?.querySelectorAll<HTMLInputElement>("input[data-reset]").forEach((el) => (el.value = ""));
    }
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-full">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Speichern …" : submitLabel}
        </button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      </div>
    </form>
  );
}
