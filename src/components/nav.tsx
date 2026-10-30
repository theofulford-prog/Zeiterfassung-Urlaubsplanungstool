"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Icon, type IconName } from "./icons";
import type { Permission } from "@/lib/permissions";

type Item = { href: string; label: string; short?: string; icon: IconName; badge?: number };

/**
 * Navigation nach HIG: Sidebar auf breiten Fenstern (Mac/iPad), Tab-Leiste unten auf dem iPhone
 * mit höchstens 5 beschrifteten Tabs. Badges nur für Wichtiges (offene Anträge).
 */
export function Nav({ name, perms, pendingCount }: { name: string; perms: Permission[]; pendingCount: number }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const mine: Item[] = [
    { href: "/zeiten", label: "Meine Zeiten", short: "Zeiten", icon: "clock" },
    { href: "/urlaub", label: "Mein Urlaub", short: "Urlaub", icon: "sun" },
    { href: "/kalender", label: "Teamkalender", short: "Kalender", icon: "calendar" },
  ];
  const has = (p: Permission) => perms.includes(p);
  const admin: Item[] = [
    ...(has("reports.view") ? [{ href: "/uebersicht", label: "Übersicht", icon: "overview" as const }] : []),
    ...(has("projects.manage") ? [{ href: "/projekte", label: "Projekte", icon: "folder" as const }] : []),
    ...(has("reports.view") ? [{ href: "/mitarbeitende", label: "Mitarbeitende", short: "Team", icon: "people" as const }] : []),
    ...(has("leave.approve") ? [{ href: "/antraege", label: "Anträge", icon: "inbox" as const, badge: pendingCount }] : []),
    ...(has("companies.manage") ? [{ href: "/gesellschaften", label: "Gesellschaften", icon: "building" as const }] : []),
    ...(has("reports.view") ? [{ href: "/rollen", label: "Rollen & Rechte", icon: "shield" as const }] : []),
  ];
  const isManager = admin.length > 0;
  const tabs: Item[] = isManager
    ? [admin[0], mine[0], mine[2], ...admin.filter((a) => a.href === "/antraege"), { href: "/mehr", label: "Mehr", icon: "more" }].slice(0, 5)
    : [...mine, { href: "/konto", label: "Konto", icon: "person" }];
  // "Mehr" bleibt aktiv, solange man sich in einem der dort gesammelten Bereiche befindet.
  const tabActive = (it: Item) =>
    active(it.href) || (it.href === "/mehr" && ["/projekte", "/mitarbeitende", "/gesellschaften", "/rollen", "/urlaub", "/konto", "/profil"].some(active));

  const sideLink = (it: Item) => (
    <Link
      key={it.href}
      href={it.href}
      aria-current={active(it.href) ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[15px] transition ${
        active(it.href) ? "bg-brand-600/10 font-semibold text-brand-700" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Icon name={it.icon} className={`h-[18px] w-[18px] ${active(it.href) ? "text-brand-600" : "text-slate-500"}`} />
      <span className="flex-1">{it.label}</span>
      {!!it.badge && (
        <span className="min-w-5 rounded-full bg-red-500 px-1.5 text-center text-xs font-semibold text-onaccent" aria-label={`${it.badge} offen`}>
          {it.badge}
        </span>
      )}
    </Link>
  );

  return (
    <>
      {/* Sidebar ab mittlerer Breite */}
      <aside className="fixed inset-y-0 hidden w-60 flex-col border-r border-slate-200/70 bg-slate-50/80 px-3 py-4 backdrop-blur-xl md:flex">
        <div className="mb-5 flex items-center gap-2 px-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-brand-600 text-[13px] font-bold text-onaccent">T</div>
          <span className="text-[15px] font-semibold">TeamZeit</span>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Hauptnavigation">
          {isManager && (
            <>
              <p className="px-2.5 pb-1 text-[12px] font-semibold text-slate-500">Verwaltung</p>
              {admin.map(sideLink)}
              <p className="px-2.5 pt-5 pb-1 text-[12px] font-semibold text-slate-500">Persönlich</p>
            </>
          )}
          {mine.map(sideLink)}
        </nav>
        <div className="mt-6 border-t border-slate-200/70 pt-3">
          {sideLink({ href: "/konto", label: name, icon: "person" })}
          <form action={logout}>
            <button className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-slate-500 hover:bg-slate-100">Abmelden</button>
          </form>
        </div>
      </aside>

      {/* Tab-Leiste auf schmalen Bildschirmen */}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {tabs.map((it) => {
            const on = tabActive(it);
            return (
              <li key={it.href} className="flex-1">
                <Link
                  href={it.href}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex min-h-[50px] flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[10px] font-medium ${
                    on ? "text-brand-600" : "text-slate-500"
                  }`}
                >
                  <Icon name={it.icon} className="h-6 w-6" />
                  {it.short ?? it.label}
                  {!!it.badge && (
                    <span className="absolute top-1 left-1/2 ml-2 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[11px] leading-[18px] font-semibold text-onaccent">
                      {it.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
