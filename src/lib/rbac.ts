import "server-only";
import { prisma } from "./db";
import { effectiveMatrix, PERMISSIONS, ROLES, setActiveMatrix, type Permission, type Role } from "./permissions";

const TTL_MS = 30_000;
const state = globalThis as unknown as { __rbacLoadedAt?: number };

/** Lädt die Rechtetabelle aus der Datenbank (mit kurzem Cache) und macht sie für can() verfügbar. */
export async function loadPermissions(force = false) {
  if (!force && state.__rbacLoadedAt && Date.now() - state.__rbacLoadedAt < TTL_MS) return;
  const rows = await prisma.rolePermission.findMany();
  const custom: Partial<Record<Role, Permission[]>> = {};
  // Eine Rolle ohne Zeilen behält ihre Standardrechte; die Markierung "__set" steht für "angepasst, ggf. leer".
  for (const r of ROLES) {
    const mine = rows.filter((x) => x.role === r);
    if (mine.length) custom[r] = mine.map((x) => x.permission).filter((p): p is Permission => p in PERMISSIONS);
  }
  setActiveMatrix(effectiveMatrix(custom));
  state.__rbacLoadedAt = Date.now();
}

/** Speichert die Rechte aller (nicht festen) Rollen. */
export async function saveRolePermissions(next: Record<Role, Permission[]>, userId: string) {
  const roles = ROLES.filter((r) => r !== "ADMIN");
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { role: { in: roles } } }),
    prisma.rolePermission.createMany({
      data: roles.flatMap((r) => [
        { role: r, permission: "__set", updatedById: userId },
        ...next[r].map((p) => ({ role: r, permission: p, updatedById: userId })),
      ]),
    }),
  ]);
  await loadPermissions(true);
}

export async function resetRolePermissions() {
  await prisma.rolePermission.deleteMany({});
  await loadPermissions(true);
}

export async function lastPermissionChange() {
  return prisma.rolePermission.findFirst({ where: { permission: "__set" }, orderBy: { updatedAt: "desc" } });
}
