import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { permissionsOf } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const perms = permissionsOf(user.role);
  const pendingCount = perms.includes("leave.approve") ? await prisma.leaveRequest.count({ where: { status: "PENDING" } }) : 0;
  return (
    <div className="min-h-screen">
      <Nav name={user.name} perms={perms} pendingCount={pendingCount} />
      <div className="pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0 md:pl-60">
        <main className="mx-auto max-w-6xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8 md:px-8 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
