"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { canManageUser, homeFor } from "@/lib/permissions";
import { createAuthLink, findValidToken, type TokenPurpose } from "@/lib/tokens";
import { loadPermissions } from "@/lib/rbac";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export type LinkState = { error?: string; url?: string; expiresAt?: string; purpose?: TokenPurpose } | undefined;

/** GF erzeugt einen Einladungs- bzw. Zurücksetzen-Link für eine Person. */
export async function generateLink(_: LinkState, form: FormData): Promise<LinkState> {
  const userId = String(form.get("userId") ?? "");
  const actor = await requirePermission("users.manage");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return { error: "Person nicht gefunden oder inaktiv." };
  // Sonst könnte sich jemand ohne Admin-Recht über einen Zurücksetzen-Link ein Admin-Konto aneignen.
  if (!canManageUser(actor.role, user.role)) return { error: "Für dieses Konto darfst du keine Links erzeugen." };
  if (!user.email) return { error: "Für eine Einladung bitte zuerst eine E-Mail-Adresse eintragen." };
  const purpose: TokenPurpose = user.passwordSetAt ? "RESET" : "INVITE";
  const { url, expiresAt } = await createAuthLink(user.id, purpose);
  revalidatePath(`/mitarbeitende/${user.id}`);
  return { url, expiresAt: expiresAt.toISOString(), purpose };
}

export async function revokeLinks(form: FormData) {
  const actor = await requirePermission("users.manage");
  const userId = String(form.get("userId") ?? "");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || !canManageUser(actor.role, target.role)) return;
  await prisma.authToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  revalidatePath(`/mitarbeitende/${userId}`);
}

/** Person setzt über den Link ihr Passwort und ist danach direkt angemeldet. */
export async function acceptInvite(_: { error?: string } | undefined, form: FormData): Promise<{ error?: string } | undefined> {
  const raw = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const repeat = String(form.get("repeat") ?? "");
  const token = await findValidToken(raw);
  if (!token) return { error: "Dieser Link ist abgelaufen oder wurde schon verwendet. Bitte die Geschäftsführung um einen neuen Link." };
  if (password.length < 8) return { error: "Das Passwort muss mindestens 8 Zeichen haben." };
  if (password !== repeat) return { error: "Die beiden Passwörter stimmen nicht überein." };

  const [, user] = await prisma.$transaction([
    prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: token.userId },
      data: { passwordHash: await bcrypt.hash(password, 10), passwordSetAt: new Date(), sessionVersion: { increment: 1 }, mustChangePassword: false },
    }),
  ]);
  const jwt = await signSession({ userId: user.id, role: user.role, name: user.name, v: user.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, jwt, sessionCookieOptions);
  await loadPermissions();
  redirect(homeFor(user.role));
}
