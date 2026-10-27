import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  addDays, addMonths, daysInRange, formatDateShort, holidayName, isValidISO, isWeekend, isoWeek, monthEnd, monthLabel, monthStart, startOfWeek,
  todayISO, weekdayShort,
} from "@/lib/dates";
import { LEAVE_TYPES } from "@/lib/format";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";

export default async function KalenderPage({ searchParams }: { searchParams: Promise<{ monat?: string; ansicht?: string }> }) {
  const me = await requireUser();
  // Gründe (Urlaub/Krankheit/Sonstiges) und Notizen nur mit entsprechendem Recht
  const isAdmin = can(me.role, "absence.reasons");
  const { monat, ansicht } = await searchParams;
  const view = ansicht === "zeitleiste" ? "zeitleiste" : "monat";
  const today = todayISO();
  const start = monthStart(isValidISO(monat) ? monat : today);
  const end = monthEnd(start);
  const days = daysInRange(start, end);
  const gridStart = startOfWeek(start);
  const gridEnd = addDays(startOfWeek(end), 6);

  const [users, leaves] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.leaveRequest.findMany({
      where: { status: { in: ["APPROVED", "PENDING"] }, startDate: { lte: gridEnd }, endDate: { gte: gridStart } },
    }),
  ]);

  const cell = (userId: string, d: string) =>
    leaves.find((l) => l.userId === userId && l.startDate <= d && l.endDate >= d);
  const absentToday = new Set(leaves.filter((l) => l.status === "APPROVED" && l.startDate <= today && l.endDate >= today).map((l) => l.userId));

  return (
    <>
      <PageHeader title="Teamkalender" subtitle={monthLabel(start)}>
        <div className="mr-2 flex rounded-[9px] bg-slate-100 p-0.5 text-[13px]" role="tablist" aria-label="Ansicht">
          {(["monat", "zeitleiste"] as const).map((v) => (
            <Link
              key={v}
              href={`/kalender?ansicht=${v}&monat=${start}`}
              role="tab"
              aria-selected={view === v}
              className={`min-w-24 rounded-[7px] px-3 py-1.5 text-center font-medium transition ${view === v ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-slate-600 hover:text-slate-900"}`}
            >
              {v === "monat" ? "Monat" : "Zeitleiste"}
            </Link>
          ))}
        </div>
        <Link className="btn-secondary" href={`/kalender?ansicht=${view}&monat=${addMonths(start, -1)}`} aria-label="Vormonat">←</Link>
        <Link className="btn-ghost" href={`/kalender?ansicht=${view}`}>Heute</Link>
        <Link className="btn-secondary" href={`/kalender?ansicht=${view}&monat=${addMonths(start, 1)}`} aria-label="Nächster Monat">→</Link>
      </PageHeader>

      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-600">
        <Legend cls={view === "monat" ? "border-l-[3px] border-sky-500 bg-sky-100" : "bg-sky-500"} label={isAdmin ? "Urlaub" : "Abwesend"} />
        {view === "monat" ? (
          <Legend cls="border border-dashed border-sky-500 bg-white" label="Urlaub beantragt (noch nicht genehmigt)" />
        ) : (
          <Legend cls="bg-sky-200 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,.7)_3px,rgba(255,255,255,.7)_6px)]" label="Urlaub beantragt" />
        )}
        {isAdmin && <Legend cls="bg-rose-400" label="Krank" />}
        {isAdmin && <Legend cls="bg-violet-400" label="Sonstiges" />}
        <Legend cls="bg-slate-200" label="Wochenende / Feiertag" />
      </div>

      {view === "monat" ? (
        <MonthGrid
          from={gridStart}
          to={gridEnd}
          month={start.slice(0, 7)}
          today={today}
          isAdmin={isAdmin}
          meId={me.id}
          leaves={leaves.map((l) => ({ ...l, name: users.find((u) => u.id === l.userId)?.name ?? "?" }))}
        />
      ) : (
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-40 bg-white px-3 py-2 text-left font-medium text-slate-500">Person</th>
              {days.map((d) => (
                <th
                  key={d}
                  title={holidayName(d)}
                  className={`w-7 min-w-7 px-0 py-1.5 text-center font-medium ${d === today ? "text-brand-700" : "text-slate-500"} ${isWeekend(d) || holidayName(d) ? "bg-slate-100" : ""}`}
                >
                  <div className="text-[10px] text-slate-400">{weekdayShort(d)}</div>
                  {Number(d.slice(8))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-sm whitespace-nowrap">
                  {u.name}
                  {absentToday.has(u.id) && <span className="ml-2 text-[11px] text-sky-600">heute abwesend</span>}
                </td>
                {days.map((d) => {
                  const l = cell(u.id, d);
                  const off = isWeekend(d) || holidayName(d);
                  let cls = off ? "bg-slate-100" : "";
                  if (l && !off) {
                    const color = !isAdmin ? "bg-sky-500" : l.type === "SICK" ? "bg-rose-400" : l.type === "OTHER" ? "bg-violet-400" : "bg-sky-500";
                    cls = l.status === "PENDING"
                      ? "bg-sky-200 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,.7)_3px,rgba(255,255,255,.7)_6px)]"
                      : color;
                  }
                  return <td key={d} className={`h-8 border-l border-white ${cls} ${d === today ? "outline outline-brand-500" : ""}`} title={isAdmin ? (l?.note ?? undefined) : undefined} />;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </>
  );
}

type CalLeave = { id: string; userId: string; name: string; startDate: string; endDate: string; type: string; status: string; note: string | null; halfDay: boolean };

const MAX_LANES = 5;

type Segment = { l: CalLeave; col: number; span: number; startsHere: boolean; endsHere: boolean; lane: number };

/** Abwesenheiten einer Woche als Balkensegmente, auf möglichst wenige Zeilen ("Spuren") verteilt. */
function layoutWeek(week: string[], leaves: CalLeave[]): Segment[] {
  const ws = week[0];
  const we = week[6];
  const segs = leaves
    .filter((l) => l.startDate <= we && l.endDate >= ws)
    .map((l) => {
      const s = l.startDate > ws ? l.startDate : ws;
      const e = l.endDate < we ? l.endDate : we;
      const col = week.indexOf(s);
      return { l, col, span: week.indexOf(e) - col + 1, startsHere: l.startDate >= ws, endsHere: l.endDate <= we, lane: 0 };
    })
    .sort((a, b) => a.col - b.col || b.span - a.span || a.l.name.localeCompare(b.l.name));
  const laneEnds: number[] = [];
  for (const seg of segs) {
    let lane = laneEnds.findIndex((end) => end < seg.col);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = seg.col + seg.span - 1;
    seg.lane = lane;
  }
  return segs;
}

/** Klassische Monatsansicht: Wochen als Zeilen, Mo–So als Spalten, mehrtägige Abwesenheiten als durchgehende Balken. */
function MonthGrid({ from, to, month, today, isAdmin, meId, leaves }: {
  from: string; to: string; month: string; today: string; isAdmin: boolean; meId: string; leaves: CalLeave[];
}) {
  const days = daysInRange(from, to);
  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  return (
    <div className="card overflow-x-auto">
      <div className="sm:min-w-[720px]">
        <div className="grid grid-cols-[1.75rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] border-b border-slate-200 text-xs font-medium text-slate-500">
          <div className="px-2 py-2 text-center text-[10px] text-slate-400">KW</div>
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div key={d} className="px-1 py-2 sm:px-2">{d}</div>
          ))}
        </div>
        {weeks.map((week) => {
          const segs = layoutWeek(week, leaves);
          const shown = segs.filter((s) => s.lane < MAX_LANES);
          const hidden = segs.filter((s) => s.lane >= MAX_LANES);
          const lanes = Math.max(2, Math.min(MAX_LANES, Math.max(0, ...segs.map((s) => s.lane + 1))));
          const overflowRow = hidden.length ? lanes + 2 : 0;
          const rows = lanes + (hidden.length ? 1 : 0);
          return (
            <div
              key={week[0]}
              className="grid grid-cols-[1.75rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 pb-2 last:border-b-0"
              style={{ gridTemplateRows: `auto repeat(${rows}, 1.375rem)` }}
            >
              <div className="row-span-full px-2 py-2 text-center text-[11px] text-slate-400" style={{ gridColumn: 1, gridRow: "1 / -1" }}>
                {isoWeek(week[0])}
              </div>
              {/* Tageshintergrund + Kopfzeile */}
              {week.map((d, i) => {
                const hol = holidayName(d);
                const off = isWeekend(d) || !!hol;
                return (
                  <div
                    key={d}
                    className={`-mb-2 border-l border-slate-100 ${off ? "bg-slate-50" : "bg-white"} ${d.startsWith(month) ? "" : "opacity-45"}`}
                    style={{ gridColumn: i + 2, gridRow: "1 / -1" }}
                  />
                );
              })}
              {week.map((d, i) => {
                const hol = holidayName(d);
                const off = isWeekend(d) || !!hol;
                return (
                  <div
                    key={`h${d}`}
                    className={`flex items-baseline justify-between gap-1 px-1 pt-1.5 pb-1 sm:px-2 ${d.startsWith(month) ? "" : "opacity-45"}`}
                    style={{ gridColumn: i + 2, gridRow: 1 }}
                  >
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        d === today ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-onaccent" : off ? "text-slate-400" : "text-slate-700"
                      }`}
                    >
                      {Number(d.slice(8))}
                    </span>
                    {hol && <span className="hidden truncate text-[10px] text-slate-500 sm:inline" title={hol}>{hol}</span>}
                  </div>
                );
              })}
              {shown.map((seg) => (
                <Bar key={seg.l.id} seg={seg} isAdmin={isAdmin} mine={seg.l.userId === meId} />
              ))}
              {hidden.length > 0 &&
                week.map((d, i) => {
                  const n = hidden.filter((s) => s.col <= i && s.col + s.span > i);
                  return n.length ? (
                    <div
                      key={`o${d}`}
                      className="px-2 text-[11px] leading-[1.375rem] text-slate-500"
                      style={{ gridColumn: i + 2, gridRow: overflowRow }}
                      title={n.map((s) => s.l.name).join(", ")}
                    >
                      +{n.length} weitere
                    </div>
                  ) : null;
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ seg, isAdmin, mine }: { seg: Segment; isAdmin: boolean; mine: boolean }) {
  const { l } = seg;
  const pending = l.status === "PENDING";
  const tone = !isAdmin || l.type === "VACATION"
    ? { solid: "border-sky-500 bg-sky-100 text-sky-950", dashed: "border-sky-500 text-sky-900" }
    : l.type === "SICK"
      ? { solid: "border-rose-400 bg-rose-100 text-rose-950", dashed: "border-rose-400 text-rose-900" }
      : { solid: "border-violet-400 bg-violet-100 text-violet-950", dashed: "border-violet-400 text-violet-900" };
  const what = isAdmin ? LEAVE_TYPES[l.type] : "Abwesend";
  const title = `${l.name} · ${what}${pending ? " (beantragt)" : ""} · ${formatDateShort(l.startDate)}–${formatDateShort(l.endDate)}${isAdmin && l.note ? " · " + l.note : ""}`;
  // Abgerundete Enden nur dort, wo die Abwesenheit wirklich beginnt/endet – sonst läuft der Balken in die Nachbarwoche weiter.
  const rounded = `${seg.startsHere ? "ml-1 rounded-l-md border-l-[3px]" : "rounded-l-none border-l-0"} ${seg.endsHere ? "mr-1 rounded-r-md" : "rounded-r-none border-r-0"}`;
  return (
    <div
      title={title}
      className={`z-[1] my-px flex items-center truncate px-1 text-[10px] leading-4 sm:px-1.5 sm:text-[11px] ${rounded} ${
        pending ? `border border-dashed bg-white ${tone.dashed} italic` : `${tone.solid}`
      } ${mine ? "font-semibold" : ""}`}
      style={{ gridColumn: `${seg.col + 2} / span ${seg.span}`, gridRow: seg.lane + 2 }}
    >
      <span className="truncate">
        {!seg.startsHere && "… "}
        {l.name}
        {l.halfDay && <span className="not-italic text-slate-500"> · ½ Tag</span>}
        {pending && <span className="not-italic text-slate-400"> · beantragt</span>}
      </span>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded-sm ${cls}`} /> {label}
    </span>
  );
}
