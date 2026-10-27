import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { ProjectForm } from "@/components/project-form";

export default async function NeuesProjektPage() {
  const me = await requirePermission("projects.manage");
  return (
    <>
      <PageHeader title="Neues Projekt" subtitle="z. B. eine Wohnungsrenovierung oder ein laufendes Thema wie die Hausverwaltung" />
      <section className="card max-w-3xl p-5"><ProjectForm showBudget={can(me.role, "costs.view")} /></section>
    </>
  );
}
