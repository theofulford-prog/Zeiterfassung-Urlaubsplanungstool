"use client";

import { useState } from "react";
import { Icon } from "./icons";

/**
 * Auf dem iPhone eingeklappt hinter einem Knopf, auf großen Bildschirmen immer offen.
 * Hält lange Formulare aus dem Weg, bis sie gebraucht werden.
 */
export function Disclosure({ label, title, children, className = "" }: { label: string; title: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`card ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left text-[16px] font-semibold text-brand-700 md:hidden ${open ? "border-b border-slate-100" : ""}`}
      >
        <Icon name={open ? "chevronDown" : "plus"} className="h-5 w-5" />
        <span className="flex-1">{label}</span>
      </button>
      <div className={`${open ? "block" : "hidden"} p-4 md:block md:p-5`}>
        <h2 className="mb-3 hidden font-semibold md:block">{title}</h2>
        {children}
      </div>
    </section>
  );
}
