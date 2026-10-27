"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { LOCKED, PERMISSIONS, ROLES, type Permission, type Role } from "@/lib/permissions";
import { resetRolePermissions, saveRolePermissions } from "@/lib/rbac";
import type { FormState } from "./auth";

/** Speichert die angehakten Rechte je Rolle (nur Admins). */
export async function savePermissions(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requirePermission("roles.manage");
  const next = {} as Record<Role, Permission[]>;
  for (const r of ROLES) {
    next[r] = (Object.keys(PERMISSIONS) as Permission[]).filter(
      (p) => !LOCKED.adminOnly.includes(p) && form.get(`${r}:${p}`) === "on",
    );
  }
  await saveRolePermissions(next, admin.id);
  revalidatePath("/", "layout");
  return { ok: "Rechte gespeichert. Sie gelten ab sofort für alle Personen der jeweiligen Rolle." };
}

export async function resetPermissions() {
  await requirePermission("roles.manage");
  await resetRolePermissions();
  revalidatePath("/", "layout");
}
