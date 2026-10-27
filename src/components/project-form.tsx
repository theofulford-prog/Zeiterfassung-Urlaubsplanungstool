import { saveProject } from "@/app/actions/admin";
import { ActionForm } from "@/components/action-form";
import { PROJECT_CATEGORIES } from "@/lib/format";

type P = { id: string; name: string; category: string; description: string | null; budget: number | null; active: boolean };

export function ProjectForm({ project, showBudget = true }: { project?: P; showBudget?: boolean }) {
  return (
    <ActionForm action={saveProject} submitLabel={project ? "Änderungen speichern" : "Projekt anlegen"} className="grid gap-4 sm:grid-cols-2">
      {project && <input type="hidden" name="id" value={project.id} />}
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input className="input" id="name" name="name" defaultValue={project?.name} placeholder="z. B. Renovierung Musterstr. 12, WE 3" required />
      </div>
      <div>
        <label className="label" htmlFor="category">Kategorie</label>
        <input className="input" id="category" name="category" list="categories" defaultValue={project?.category ?? "Renovierung"} required />
        <datalist id="categories">
          {PROJECT_CATEGORIES.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">Beschreibung (optional)</label>
        <input className="input" id="description" name="description" defaultValue={project?.description ?? ""} />
      </div>
      {showBudget && <div>
        <label className="label" htmlFor="budget">Budget Personalkosten in € (optional)</label>
        <input className="input" id="budget" name="budget" inputMode="decimal" defaultValue={project?.budget ?? ""} />
      </div>}
      <div>
        <label className="label" htmlFor="active">Status</label>
        <select className="input" id="active" name="active" defaultValue={project?.active === false ? "off" : "on"}>
          <option value="on">Aktiv – Zeiten können gebucht werden</option>
          <option value="off">Abgeschlossen – keine neuen Buchungen</option>
        </select>
      </div>
    </ActionForm>
  );
}
