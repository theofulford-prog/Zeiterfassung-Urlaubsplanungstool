"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { homeFor } from "@/lib/permissions";
import { todayISO } from "@/lib/dates";
import { hasAccessOn } from "@/lib/employment";
import { loadPermissions } from "@/lib/rbac";
import { clearFailures, isLocked, registerFailure } from "@/lib/rate-limit";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | undefined;

// Vergleichswert, damit unbekannte E-Mails gleich lange brauchen wie falsche Passwörter.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

async function issueSession(user: { id: string; role: string; name: string; sessionVersion: number }) {
  const token = await signSession({ userId: user.id, role: user.role, name: user.name, v: user.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const keys = [`email:${email}`, `ip:${ip}`];
  if (keys.some(isLocked)) return { error: "Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen." };

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  const emps = user ? await prisma.employment.findMany({ where: { userId: user.id }, select: { id: true, startDate: true, endDate: true } }) : [];
  const exited = !!user && !hasAccessOn(user, emps, todayISO());
  if (!user || !user.active || exited || !ok) {
    keys.forEach(registerFailure);
    return { error: "E-Mail oder Passwort ist falsch." };
  }
  keys.forEach(clearFailures);
  await issueSession(user);
  await loadPermissions();
  redirect(user.mustChangePassword ? "/passwort-aendern" : homeFor(user.role));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser({ allowPasswordChange: true });
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const repeat = String(form.get("repeat") ?? "");
  if (!(await bcrypt.compare(current, user.passwordHash))) return { error: "Das aktuelle Passwort stimmt nicht." };
  if (next.length < 8) return { error: "Das neue Passwort muss mindestens 8 Zeichen haben." };
  if (next !== repeat) return { error: "Die beiden neuen Passwörter stimmen nicht überein." };
  if (next === current) return { error: "Das neue Passwort muss sich vom bisherigen unterscheiden." };
  // Alle anderen Sitzungen (z. B. auf anderen Geräten) werden damit ungültig.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10), sessionVersion: { increment: 1 }, mustChangePassword: false, passwordSetAt: new Date() },
  });
  await issueSession(updated);
  // Beim erzwungenen Wechsel nach dem ersten Login direkt weiter zur Startseite.
  if (user.mustChangePassword) redirect(homeFor(updated.role));
  return { ok: "Passwort wurde geändert. Andere Geräte wurden abgemeldet." };
}
