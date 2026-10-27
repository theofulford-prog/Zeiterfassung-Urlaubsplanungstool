import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { UserForm } from "@/components/user-form";

export default async function NeuePersonPage() {
  const me = await requirePermission("users.manage");
  return (
    <>
      <PageHeader title="Person anlegen" subtitle="Nach dem Speichern erzeugst du einen Einladungslink. Darüber legt die Person ihr Passwort selbst fest." />
      <section className="card max-w-3xl p-5"><UserForm actorRole={me.role} /></section>
    </>
  );
}
