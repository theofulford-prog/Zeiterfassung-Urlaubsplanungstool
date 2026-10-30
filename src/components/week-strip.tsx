import Link from "next/link";
import { formatNum } from "@/lib/format";

export type StripDay = {
  date: string;
  weekday: string; // "Mo"
  day: number; // 27
  hours: number;
  off: boolean; // Wochenende oder Feiertag
  absent: boolean; // genehmigte Abwesenheit
  today: boolean;
};

/** Wochenstreifen Mo–So: antippen wählt den Tag; zeigt die gebuchten Stunden je Tag. */
export function WeekStrip({ days, selected }: { days: StripDay[]; selected: string }) {
  return (
    <nav aria-label="Tag wählen" className="card grid grid-cols-7 gap-1 p-1.5">
      {days.map((d) => {
        const sel = d.date === selected;
        return (
          <Link
            key={d.date}
            href={`/zeiten?tag=${d.date}`}
            scroll={false}
            aria-current={sel ? "date" : undefined}
            aria-label={`${d.weekday} ${d.day}., ${d.hours ? `${formatNum(d.hours)} Stunden` : "nichts gebucht"}`}
            className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-[10px] transition active:scale-95 ${
              sel ? "bg-brand-600 text-onaccent" : d.off ? "text-slate-400 hover:bg-slate-50" : "hover:bg-slate-50"
            }`}
          >
            <span className={`text-[11px] font-medium ${sel ? "opacity-90" : "text-slate-500"}`}>{d.weekday}</span>
            <span className={`text-[17px] leading-none font-semibold tabular-nums ${d.today && !sel ? "text-brand-600" : ""}`}>{d.day}</span>
            <span className={`text-[11px] tabular-nums ${sel ? "opacity-90" : d.hours ? "text-slate-600" : "text-slate-300"}`}>
              {d.absent ? "frei" : d.hours ? `${formatNum(d.hours)} h` : "–"}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
