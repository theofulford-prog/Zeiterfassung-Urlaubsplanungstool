import "server-only";
import type { Company, Employment, EmploymentTerms } from "@prisma/client";
import { prisma } from "./db";

export type EmploymentFull = Employment & { company: Company; terms: EmploymentTerms[] };

/** Arbeitsverhältnisse je Person, Konditionen nach Gültig-ab sortiert. */
export async function loadEmployments(userIds: string[]): Promise<Map<string, EmploymentFull[]>> {
  const rows = await prisma.employment.findMany({
    where: { userId: { in: userIds } },
    include: { company: true, terms: { orderBy: { validFrom: "asc" } } },
    orderBy: { startDate: "asc" },
  });
  const map = new Map<string, EmploymentFull[]>(userIds.map((id) => [id, []]));
  for (const r of rows) map.get(r.userId)?.push(r);
  return map;
}

/** Arbeitsverhältnis der jüngsten Buchung – Vorauswahl, wenn eine Person mehrere hat. */
export async function lastUsedEmploymentId(userId: string): Promise<string | null> {
  const last = await prisma.timeEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { employmentId: true },
  });
  return last?.employmentId ?? null;
}

/** Kurzname der Gesellschaft für knappe Anzeigen. */
export const companyLabel = (e: { company: { name: string; shortName: string | null } }) => e.company.shortName ?? e.company.name;
