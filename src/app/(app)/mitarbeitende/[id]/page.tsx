import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { can, canManageUser, ROLE_INFO, normalizeRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { addMonths, isWorkday, monthEnd, monthLabel, monthLabelShort, todayISO } from "@/lib/dates";
import { formatEUR, formatNum } from "@/lib/format";
import { carryoverFor, leaveWorkdaysIn, proRataVacation, targetHours, trackingStart as userTrackingStart, vacationBalance } from "@/lib/stats";
import { formatDate } from "@/lib/dates";
import { UserDangerZone } from "@/components/user-danger-zone";
import { arbzgWarnings } from "@/lib/worktime";
import { PageHeader } from "@/components/page-header";
import { PeriodNav } from "@/components/period-nav";
import { StatStrip } from "@/components/stat-strip";
import { Icon } from "@/components/icons";
import { UserForm } from "@/components/user-form";
import { InvitePanel } from "@/components/invite-panel";

const signed = (n: number) => `${n > 0 ? "+" : ""}${formatNum(n)}`;

export default async function PersonPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ jahr?: string }> }) {
  const me = await requirePermission("reports.view");
  const showCosts = can(me.role, "costs.view");
  const showReasons = can(me.role, "absence.reasons");
  const { id } = await params;
  const { jahr } = await searchParams;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();
  // Stammdaten und Zugang pflegen: nur mit Verwaltungsrecht; Admin-Konten nur durch Admins.
  const mayManage = canManageUser(me.role, user.role);

  const today = todayISO();
  const thisYear = Number(today.slice(0, 4));
  const year = /^\d{4}$/.test(jahr ?? "") && Math.abs(Number(jahr) - thisYear) <= 5 ? Number(jahr) : thisYear;
  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;

  const [entries, leaves, workDays, firstEntry, openToken, entryCount] = await Promise.all([
    prisma.timeEntry.findMany({ where: { userId: id, date: { gte: yStart, lte: yEnd } }, include: { project: true } }),
    prisma.leaveRequest.findMany({ where: { userId: id, status: { in: ["APPROVED", "PENDING"] } } }),
    prisma.workDay.findMany({ where: { userId: id, date: { gte: yStart, lte: yEnd } } }),
    prisma.timeEntry.findFirst({ where: { userId: id }, orderBy: { date: "asc" }, select: { date: true } }),
    prisma.authToken.findFirst({ where: { userId: id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
    prisma.timeEntry.count({ where: { userId: id } }),
  ]);

  // Soll zählt erst ab Beginn der Erfassung (Anlage der Person bzw. erste Buchung) und höchstens bis heute.
  const created = userTrackingStart(user);
  const trackingStart = firstEntry && firstEntry.date < created ? firstEntry.date : created;

  let saldo = 0;
  const months = Array.from({ length: 12 }, (_, i) => addMonths(yStart, i)).map((m) => {
    const mEnd = monthEnd(m);
    const from = m > trackingStart ? m : trackingStart;
    const capped = user.exitDate && user.exitDate < today ? user.exitDate : today;
    const to = mEnd < capped ? mEnd : capped;
    const inMonth = entries.filter((e) => e.date >= m && e.date <= mEnd);
    const ist = inMonth.reduce((s, e) => s + e.hours, 0);
    const soll = from <= to ? targetHours(user.weeklyHours, from, to, leaves) : 0;
    const counted = m <= today;
    if (counted) saldo += ist - soll;
    const days = (type: string) => leaves.filter((l) => l.type === type && l.status === "APPROVED").reduce((s, l) => s + leaveWorkdaysIn(l, m, mEnd), 0);
    return {
      m, ist, soll, counted, saldo,
      vacation: days("VACATION"), sick: days("SICK"),
      cost: inMonth.reduce((s, e) => s + e.hours * e.costRate, 0),
    };
  });

  const bal = vacationBalance(user.vacationDaysPerYear, year, leaves, carryoverFor(user, year));
  const sickDays = months.reduce((s, m) => s + m.sick, 0);
  const istYear = entries.reduce((s, e) => s + e.hours, 0);

  const perProject = new Map<string, { name: string; hours: number; cost: number }>();
  for (const e of entries) {
    const p = perProject.get(e.projectId) ?? { name: e.project.name, hours: 0, cost: 0 };
    p.hours += e.hours;
    p.cost += e.hours * e.costRate;
    perProject.set(e.projectId, p);
  }

  // Arbeitszeiterfassung: fehlende Tage und Verstöße gegen das ArbZG
  const bookedDays = new Set(entries.map((e) => e.date));
  const workDayDates = new Set(workDays.map((w) => w.date));
  const missingWork = [...bookedDays].filter((d) => !workDayDates.has(d)).length;
  const violations = workDays.filter((w) => arbzgWarnings(w).length > 0);
  const weekendWork = [...bookedDays].filter((d) => !isWorkday(d)).length;

  return (
    <>
      <Link href="/mitarbeitende" className="mb-1 inline-flex min-h-9 items-center gap-1 text-[15px] text-brand-700">
        <Icon name="chevronLeft" className="h-4 w-4" /> Mitarbeitende
      </Link>
      <PageHeader title={user.name} subtitle={`${ROLE_INFO[normalizeRole(user.role)].label} · ${formatNum(user.weeklyHours)} h/Woche · ${user.email}`}>
        <div className="flex w-full gap-2 md:w-auto">
          <PeriodNav
            label={`Auswertung ${year}`}
            prevHref={`/mitarbeitende/${id}?jahr=${year - 1}`}
            nextHref={year < thisYear ? `/mitarbeitende/${id}?jahr=${year + 1}` : `/mitarbeitende/${id}`}
            todayHref={year === thisYear ? undefined : `/mitarbeitende/${id}`}
            prevLabel="Voriges Jahr"
            nextLabel="Nächstes Jahr"
          />
          {can(me.role, "export.data") && (
            <a className="card flex min-h-[52px] w-[52px] shrink-0 items-center justify-center text-brand-700" href={`/api/export?von=${yStart}&bis=${yEnd}&person=${id}`} aria-label={`CSV-Export ${year}`} title={`CSV-Export ${year}`}>
              <Icon name="download" />
            </a>
          )}
        </div>
      </PageHeader>

      {(user.exitDate || user.anonymizedAt || !user.active) && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[15px]">
          {user.anonymizedAt ? (
            <>Diese Person wurde am {user.anonymizedAt.toLocaleDateString("de-DE")} anonymisiert. Ihre Stunden zählen weiter in den Projektkosten.</>
          ) : user.exitDate ? (
            <>
              {user.exitDate < today ? "Ausgetreten" : "Austritt geplant"} zum <b>{formatDate(user.exitDate)}</b>
              {user.exitDate < today ? " – kein Login mehr." : " – bis dahin normaler Zugang."}
              {(() => {
                const y = Number(user.exitDate.slice(0, 4));
                const pr = proRataVacation(user.vacationDaysPerYear, y, user);
                const b = vacationBalance(pr.days, y, leaves, carryoverFor(user, y));
                return (
                  <span className="mt-1 block text-[13px] text-slate-500">
                    Urlaub {y} anteilig (1/12-Regel, {pr.months} volle Monate): {formatNum(pr.days)} Tage
                    {b.carryover ? ` + ${formatNum(b.carryover)} Resturlaub` : ""} · genommen/genehmigt {formatNum(b.taken)} ·{" "}
                    <b className={b.remaining < 0 ? "text-amber-700" : ""}>
                      {b.remaining < 0 ? `${formatNum(-b.remaining)} Tage zu viel genommen` : `${formatNum(b.remaining)} Tage offen (ggf. abgelten)`}
                    </b>
                    {" "}– bitte arbeitsrechtlich prüfen (z. B. voller gesetzlicher Mindesturlaub bei Austritt in der zweiten Jahreshälfte).
                  </span>
                );
              })()}
            </>
          ) : (
            <>Zugang gesperrt.</>
          )}
        </div>
      )}

      {/* Offene Einladung zuerst zeigen – bei aktiven Konten steht der Zugang unten bei den Stammdaten */}
      {user.active && mayManage && !user.passwordSetAt && (
        <InvitePanel
          userId={user.id}
          name={user.name}
          email={user.email}
          registered={!!user.passwordSetAt}
          openUntil={openToken?.expiresAt.toISOString() ?? null}
        />
      )}

      <StatStrip
        className="mb-4 md:mb-6"
        items={[
          {
            label: `Saldo ${year}${year === thisYear ? " bis heute" : ""}`,
            value: `${signed(saldo)} h`,
            tone: saldo < -8 || saldo > 40 ? "warn" : "good",
            hint: "Ist minus Soll",
          },
          { label: `Stunden ${year}`, value: `${formatNum(istYear)} h`, hint: showCosts ? formatEUR(months.reduce((s, m) => s + m.cost, 0)) : undefined },
          {
            label: `Urlaub übrig`,
            value: `${formatNum(bal.remaining)} / ${formatNum(bal.total)}`,
            hint: `${formatNum(bal.taken)} genommen${bal.pending ? `, ${formatNum(bal.pending)} beantragt` : ""}`,
          },
          showReasons
            ? { label: `Krankheitstage ${year}`, value: formatNum(sickDays) }
            : { label: `Projekte ${year}`, value: String(perProject.size) },
        ]}
      />

      {(missingWork > 0 || violations.length > 0) && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-900 md:mb-6 md:px-5">
          <b>Arbeitszeiterfassung:</b>{" "}
          {missingWork > 0 && <>an {missingWork} Tag(en) wurden Projektstunden ohne Beginn/Ende gebucht. </>}
          {violations.length > 0 && <>{violations.length} Tag(e) mit Hinweis nach Arbeitszeitgesetz (Pausen bzw. über 10 h). </>}
          {weekendWork > 0 && <>{weekendWork} Buchung(en) an Wochenenden/Feiertagen.</>}
        </div>
      )}

      <div className="mb-4 grid gap-4 md:mb-6 md:gap-6 lg:grid-cols-3">
        <section className="card overflow-x-auto lg:col-span-2">
          <h2 className="px-4 pt-4 pb-2 font-semibold md:px-5">Monatsübersicht</h2>
          {/* Auf dem iPhone nur Monat, Ist, Differenz und Saldo */}
          <table className="data-table md:min-w-[640px]">
            <thead>
              <tr>
                <th>Monat</th><th className="hidden text-right! md:table-cell">Soll</th><th className="text-right!">Ist</th><th className="text-right!">Diff.</th>
                <th className="text-right!">Saldo</th><th className="hidden text-right! md:table-cell">Urlaub</th>{showReasons && <th className="hidden text-right! md:table-cell">Krank</th>}{showCosts && <th className="hidden text-right! md:table-cell">Kosten</th>}
              </tr>
            </thead>
            <tbody>
              {months.map((r) => (
                <tr key={r.m} className={r.counted ? "" : "text-slate-300"}>
                  <td className="whitespace-nowrap"><span className="md:hidden">{monthLabelShort(r.m)}</span><span className="hidden md:inline">{monthLabel(r.m)}</span></td>
                  <td className="hidden text-right tabular-nums md:table-cell">{r.counted ? formatNum(r.soll) : "–"}</td>
                  <td className="text-right tabular-nums">{r.counted ? formatNum(r.ist) : "–"}</td>
                  <td className={`text-right tabular-nums ${r.ist - r.soll < -0.01 ? "text-amber-700" : ""}`}>{r.counted ? signed(r.ist - r.soll) : "–"}</td>
                  <td className="text-right font-medium tabular-nums">{r.counted ? signed(r.saldo) : "–"}</td>
                  <td className="hidden text-right tabular-nums md:table-cell">{r.vacation ? formatNum(r.vacation) : "–"}</td>
                  {showReasons && <td className="hidden text-right tabular-nums md:table-cell">{r.sick ? formatNum(r.sick) : "–"}</td>}
                  {showCosts && <td className="hidden text-right tabular-nums md:table-cell">{r.counted ? formatEUR(r.cost) : "–"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card overflow-x-auto">
          <h2 className="px-4 pt-4 pb-2 font-semibold md:px-5">Projekte {year}</h2>
          <table className="data-table">
            <thead><tr><th>Projekt</th><th className="text-right!">Std.</th><th className="text-right!">Anteil</th></tr></thead>
            <tbody>
              {[...perProject.entries()].sort((a, b) => b[1].hours - a[1].hours).map(([pid, p]) => (
                <tr key={pid}>
                  <td><Link className="hover:text-brand-700" href={`/projekte/${pid}`}>{p.name}</Link></td>
                  <td className="text-right tabular-nums">{formatNum(p.hours)}</td>
                  <td className="text-right text-slate-500 tabular-nums">{istYear ? Math.round((p.hours / istYear) * 100) : 0} %</td>
                </tr>
              ))}
              {perProject.size === 0 && <tr><td colSpan={3} className="py-6 text-center text-slate-400">Keine Buchungen.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      {user.active && mayManage && user.passwordSetAt && (
        <InvitePanel
          userId={user.id}
          name={user.name}
          email={user.email}
          registered={!!user.passwordSetAt}
          openUntil={openToken?.expiresAt.toISOString() ?? null}
        />
      )}

      {mayManage && !user.anonymizedAt && (
        <section className="card mb-6 max-w-3xl p-4 md:p-5">
          <h2 className="mb-4 font-semibold">Stammdaten bearbeiten</h2>
          <UserForm user={user} actorRole={me.role} />
        </section>
      )}

      {mayManage && can(me.role, "users.delete") && user.id !== me.id && (
        <UserDangerZone id={user.id} name={user.name} entries={entryCount} anonymized={!!user.anonymizedAt} />
      )}
    </>
  );
}
