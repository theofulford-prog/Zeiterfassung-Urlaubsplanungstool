"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { todayISO } from "@/lib/dates";
import { requirePermission } from "@/lib/auth";
import { assignableRoles, can, canManageUser, normalizeRole, ROLE_INFO } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { diffChanges } from "@/lib/audit-diff";
import type { FormState } from "./auth";

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export async function saveUser(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requirePermission("users.manage");
  const id = String(form.get("id") ?? "") || null;
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase() || null;
  const role = normalizeRole(String(form.get("role") ?? "EMPLOYEE"));
  const active = form.get("active") !== "off";
  const tracksTime = form.get("tracksTime") !== "off";
  const accessWithoutEmployment = form.get("accessWithoutEmployment") === "on";
  const password = String(form.get("password") ?? "");

  if (!name) return { error: "Bitte einen Namen angeben." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (password && password.length < 8) return { error: "Das Passwort muss mindestens 8 Zeichen haben." };
  if (password && !email) return { error: "Für ein Passwort braucht die Person eine E-Mail-Adresse zum Anmelden." };

  const clash = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (clash && clash.id !== id) return { error: "Diese E-Mail-Adresse ist schon vergeben." };
  const existing = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (id && !existing) return { error: "Person nicht gefunden." };

  // Rollenregeln
  if (existing && !canManageUser(actor.role, existing.role)) {
    return { error: `Konten mit der Rolle „${ROLE_INFO[normalizeRole(existing.role)].label}“ darfst du nicht bearbeiten.` };
  }
  if ((!existing || existing.role !== role) && !assignableRoles(actor.role).includes(role)) {
    return { error: `Die Rolle „${ROLE_INFO[role].label}“ darfst du nicht vergeben.` };
  }
  if (existing && existing.id === actor.id && (existing.role !== role || !active)) {
    return { error: "Die eigene Rolle und der eigene Status können nur von einer anderen Person geändert werden." };
  }
  if (existing?.role === "ADMIN" && existing.active && (role !== "ADMIN" || !active)) {
    const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true, id: { not: existing.id } } });
    if (otherAdmins === 0) return { error: "Es muss mindestens ein aktiver Admin bestehen bleiben." };
  }

  // Vertragsdaten (Eintritt, Austritt, Wochenstunden, Urlaub, Kostensatz) gehören zum Arbeitsverhältnis – siehe actions/employment.ts.
  const data = { name, email, role, tracksTime, active, accessWithoutEmployment };
  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
  try {
    if (existing) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.id },
          // Neues Passwort durch GF/Admin gilt als Startpasswort, muss beim nächsten Login geändert werden und meldet überall ab.
          data: { ...data, ...(passwordHash && { passwordHash, mustChangePassword: true, sessionVersion: { increment: 1 } }) },
        });
        await audit({
          actorId: actor.id, action: "person.update", entityType: "User", entityId: existing.id,
          subjectUserId: existing.id, changes: diffChanges(existing, data),
        }, tx);
      });
    } else {
      // Ohne Passwort wird die Person per Einladungslink eingeladen; bis dahin ist kein Login möglich.
      const created = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            ...data,
            passwordHash: passwordHash ?? null,
            passwordSetAt: passwordHash ? new Date() : null,
            mustChangePassword: !!passwordHash,
          },
        });
        await audit({
          actorId: actor.id, action: "person.create", entityType: "User", entityId: u.id,
          subjectUserId: u.id, changes: diffChanges(null, data),
        }, tx);
        return u;
      });
      revalidatePath("/", "layout");
      redirect(`/mitarbeitende/${created.id}`);
    }
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { error: "Diese E-Mail-Adresse ist schon vergeben." };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/mitarbeitende");
}

export async function saveProject(_: FormState, form: FormData): Promise<FormState> {
  const actor = await requirePermission("projects.manage");
  const id = String(form.get("id") ?? "") || null;
  const name = String(form.get("name") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const description = String(form.get("description") ?? "").trim() || null;
  const budget = num(form.get("budget"));
  const active = form.get("active") !== "off";
  const tracksTime = form.get("tracksTime") !== "off";
  const entryDate = String(form.get("entryDate") ?? "").trim() || null;
  const exitDate = String(form.get("exitDate") ?? "").trim() || null;

  if (!name) return { error: "Bitte einen Projektnamen angeben." };
  if (!category) return { error: "Bitte eine Kategorie angeben." };
  if (budget !== null && (Number.isNaN(budget) || budget < 0)) return { error: "Bitte ein gültiges Budget eingeben." };

  const existingProject = id ? await prisma.project.findUnique({ where: { id } }) : null;
  if (id && !existingProject) return { error: "Projekt nicht gefunden." };
  // Das Budget (in €) pflegt nur, wer Kosten sehen darf – sonst bleibt es unverändert.
  const mayBudget = can(actor.role, "costs.view") && form.has("budget");
  const data = { name, category, description, active, ...(mayBudget ? { budget } : existingProject ? {} : { budget: null }) };
  const project = id
    ? await prisma.project.update({ where: { id }, data })
    : await prisma.project.create({ data });
  revalidatePath("/", "layout");
  redirect(`/projekte/${project.id}`);
}

async function loadDeletable(form: FormData) {
  const actor = await requirePermission("users.delete");
  const id = String(form.get("id") ?? "");
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "Person nicht gefunden." } as const;
  if (target.id === actor.id) return { error: "Das eigene Konto kann nicht gelöscht werden." } as const;
  if (!canManageUser(actor.role, target.role)) return { error: "Dieses Konto darfst du nicht löschen." } as const;
  if (target.role === "ADMIN" && target.active) {
    const others = await prisma.user.count({ where: { role: "ADMIN", active: true, id: { not: target.id } } });
    if (others === 0) return { error: "Es muss mindestens ein aktiver Admin bestehen bleiben." } as const;
  }
  return { target } as const;
}

/**
 * Anonymisieren: entfernt Name, E-Mail, Zugang und Notizen zu Abwesenheiten. Gebuchte Stunden und
 * Arbeitszeiten bleiben ohne Personenbezug erhalten (Projektkosten, Aufbewahrungspflicht).
 */
export async function anonymizeUser(_: FormState, form: FormData): Promise<FormState> {
  const r = await loadDeletable(form);
  if ("error" in r) return { error: r.error };
  const t = r.target;
  const label = `Ehemalige:r Mitarbeiter:in ${t.id.slice(-4).toUpperCase()}`;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: t.id },
      data: {
        name: label,
        email: null,
        passwordHash: null,
        accessWithoutEmployment: false,
        role: "EMPLOYEE",
        active: false,
        exitDate: t.exitDate ?? todayISO(),
        carryoverDays: 0,
        anonymizedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.authToken.deleteMany({ where: { userId: t.id } }),
    prisma.personalRecord.deleteMany({ where: { userId: t.id } }),
    prisma.leaveRequest.updateMany({ where: { userId: t.id }, data: { note: null } }),
    prisma.leaveRequest.deleteMany({ where: { userId: t.id, status: "PENDING" } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: `Anonymisiert als „${label}“.` };
}

/** Endgültig löschen – inkl. aller Buchungen, Arbeitszeiten und Abwesenheiten. Bestätigung per Namenseingabe. */
export async function deleteUser(_: FormState, form: FormData): Promise<FormState> {
  const r = await loadDeletable(form);
  if ("error" in r) return { error: r.error };
  if (String(form.get("confirmName") ?? "").trim() !== r.target.name) {
    return { error: "Zur Bestätigung bitte den Namen genau so eingeben, wie er oben steht." };
  }
  await prisma.user.delete({ where: { id: r.target.id } });
  revalidatePath("/", "layout");
  redirect("/mitarbeitende");
}
