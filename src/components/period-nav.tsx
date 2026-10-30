import Link from "next/link";
import { Icon } from "./icons";

/** Schlanke Blätter-Leiste: ‹ Zeitraum › – auf dem iPhone volle Breite, auf großen Bildschirmen kompakt. */
export function PeriodNav({
  label, sublabel, prevHref, nextHref, todayHref, prevLabel = "Zurück", nextLabel = "Weiter",
}: {
  label: string;
  sublabel?: string;
  prevHref: string;
  nextHref: string;
  /** Nur angeben, wenn der gezeigte Zeitraum nicht der aktuelle ist */
  todayHref?: string;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const btn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-brand-700 transition hover:bg-brand-50 active:scale-95";
  return (
    <div className="card flex w-full items-center gap-1 p-1 md:w-auto md:min-w-80">
      <Link href={prevHref} className={btn} aria-label={prevLabel}>
        <Icon name="chevronLeft" />
      </Link>
      <div className="min-w-0 flex-1 text-center leading-tight">
        <p className="truncate text-[15px] font-semibold">{label}</p>
        {sublabel && <p className="truncate text-[12px] text-slate-500">{sublabel}</p>}
      </div>
      {todayHref && (
        <Link href={todayHref} className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700">
          Heute
        </Link>
      )}
      <Link href={nextHref} className={btn} aria-label={nextLabel}>
        <Icon name="chevronRight" />
      </Link>
    </div>
  );
}
