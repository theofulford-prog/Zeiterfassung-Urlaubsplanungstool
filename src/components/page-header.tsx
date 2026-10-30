export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-6">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-bold tracking-tight md:text-[26px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-slate-500">{subtitle}</p>}
      </div>
      {children && <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" | "good" }) {
  return (
    <div className="card p-3 sm:p-4">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums sm:text-2xl ${tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : ""}`} aria-label={`${label}: ${value}${tone === "warn" ? " (Achtung)" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[12px] leading-snug text-slate-500 sm:text-[13px]">{hint}</p>}
    </div>
  );
}
