import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { Changes } from "./audit-diff";

export type AuditAction =
  | "person.create" | "person.update"
  | "company.create" | "company.update"
  | "employment.create" | "employment.update"
  | "terms.create" | "terms.update" | "terms.delete"
  | "personal.update" | "personal.read";

/** Schreibt einen Eintrag ins Änderungsprotokoll – innerhalb einer Transaktion, wenn `tx` übergeben wird. */
export async function audit(
  e: {
    actorId: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    subjectUserId?: string | null;
    changes?: Changes | null;
    reason?: string | null;
  },
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const changes = e.changes && Object.keys(e.changes).length ? (e.changes as Prisma.InputJsonValue) : undefined;
  await (tx ?? prisma).auditLog.create({
    data: {
      actorId: e.actorId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      subjectUserId: e.subjectUserId ?? null,
      changes,
      reason: e.reason ?? null,
    },
  });
}
