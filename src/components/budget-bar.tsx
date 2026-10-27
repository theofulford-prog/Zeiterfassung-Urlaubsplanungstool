import { formatPct } from "@/lib/format";

export function BudgetBar({ used, budget }: { used: number; budget: number }) {
  const r = used / budget;
  const c = r > 1 ? "bg-red-500" : r > 0.85 ? "bg-amber-500" : "bg-brand-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${c}`} style={{ width: `${Math.min(r, 1) * 100}%` }} />
      </div>
      <span className={`w-12 text-right text-xs tabular-nums ${r > 1 ? "font-semibold text-red-600" : ""}`}>{formatPct(r)}</span>
    </div>
  );
}
