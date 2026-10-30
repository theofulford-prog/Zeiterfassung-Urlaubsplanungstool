import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logout } from "@/app/actions/auth";
import { Icon, type IconName } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

/** Sammelseite für die iPhone-Tab-Leiste der GF (Bereiche, die nicht in 5 Tabs passen). */
export default async function MehrPage() {
  const user = await requireUser();
  if (!can(user.role, "reports.view")) redirect("/konto");
  const groups: { title: string; items: { href: string; label: string; icon: IconName }[] }[] = [
    { title: "Verwaltung", items: [
      ...(can(user.role, "projects.manage") ? [{ href: "/projekte", label: "Projekte", icon: "folder" as const }] : []),
      { href: "/mitarbeitende", label: "Mitarbeitende", icon: "people" },
      ...(can(user.role, "companies.manage") ? [{ href: "/gesellschaften", label: "Gesellschaften", icon: "building" as const }] : []),
      { href: "/rollen", label: "Rollen & Rechte", icon: "shield" },
    ] },
    { title: "Persönlich", items: [
      { href: "/urlaub", label: "Mein Urlaub", icon: "sun" },
      { href: "/profil", label: "Mein Profil", icon: "person" },
      { href: "/konto", label: "Mein Konto", icon: "person" },
    ] },
  ];
  return (
    <>
      <PageHeader title="Mehr" />
      {groups.map((g) => (
        <section key={g.title} className="mb-6">
          <h2 className="mb-1.5 px-4 text-[13px] text-slate-500">{g.title}</h2>
          <ul className="card divide-y divide-slate-100 overflow-hidden">
            {g.items.map((it) => (
              <li key={it.href}>
                <Link href={it.href} className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-[17px] active:bg-slate-100">
                  <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-brand-600 text-onaccent">
                    <Icon name={it.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1">{it.label}</span>
                  <span className="text-slate-300" aria-hidden>›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <form action={logout} className="card overflow-hidden">
        <button className="min-h-11 w-full px-4 py-2.5 text-left text-[17px] text-red-600 active:bg-slate-100">Abmelden</button>
      </form>
    </>
  );
}
