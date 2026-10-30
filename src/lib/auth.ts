import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { can, homeFor, type Permission } from "./permissions";
import { loadPermissions } from "./rbac";
import { syncExits } from "./exits";
import { todayISO } from "./dates";
import { SESSION_COOKIE, verifySession } from "./session";

/**
 * Aktuelle Person laden; leitet zum Login um, wenn keine gültige Sitzung besteht.
 * Muss das Passwort noch geändert werden, geht es zuerst dorthin.
 */
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}) {
  // Zuerst das Cookie lesen: macht die Seite dynamisch, bevor die Datenbank gefragt wird (sonst greift der Build darauf zu).
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  await Promise.all([loadPermissions(), syncExits()]);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.active || user.sessionVersion !== (session.v ?? 0)) redirect("/abmelden");
  // Nach dem letzten Arbeitstag kein Zugriff mehr (auch bevor syncExits gelaufen ist)
  if (user.exitDate && user.exitDate < todayISO()) redirect("/abmelden");
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/passwort-aendern");
  return user;
}

/** Person mit einem bestimmten Recht – sonst Weiterleitung zur eigenen Startseite. */
export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect(homeFor(user.role));
  return user;
}
