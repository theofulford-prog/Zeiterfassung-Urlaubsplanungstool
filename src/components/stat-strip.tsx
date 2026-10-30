type Item = { label: string; value: string; hint?: string; tone?: "warn" | "good"; href?: string };

/**
 * Kennzahlen in einer Karte nebeneinander statt einzelner Kacheln –
 * auf dem iPhone 2 (bei 4 Werten) bzw. 3 Spalten, damit nichts endlos untereinander steht.
 */
export function StatStrip({ items, className = "" }: { items: Item[]; className?: string }) {
  const cols = items.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : items.length === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    // gap-px auf hellem Grund ergibt saubere Trennlinien in jeder Anordnung (1×3, 2×2, 1×4)
    <div className={`card grid ${cols} gap-px overflow-hidden bg-slate-100 ${className}`}>
      {items.map((it) => {
        const inner = (
          <>
            <p className="text-[12px] leading-tight font-medium text-slate-500 sm:text-[13px]">{it.label}</p>
            <p
              className={`mt-1 text-[19px] leading-tight font-semibold tabular-nums sm:text-[22px] ${
                it.tone === "warn" ? "text-amber-600" : it.tone === "good" ? "text-emerald-600" : ""
              }`}
            >
              {it.value}
            </p>
            {it.hint && <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-[12px]">{it.hint}</p>}
          </>
        );
        const cell = "bg-white p-3 sm:p-4";
        return it.href ? (
          <a key={it.label} href={it.href} className={`block ${cell} hover:bg-slate-50`}>{inner}</a>
        ) : (
          <div key={it.label} className={cell}>{inner}</div>
        );
      })}
    </div>
  );
}
