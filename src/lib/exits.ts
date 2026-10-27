import "server-only";
import { prisma } from "./db";
import { todayISO } from "./dates";

const TTL_MS = 10 * 60 * 1000;
const state = globalThis as unknown as { __exitsSyncedAt?: number; __exitsDay?: string };

/**
 * Setzt Personen nach ihrem letzten Arbeitstag auf inaktiv, zieht offene Anträge nach dem Austritt zurück
 * und macht offene Einladungslinks ungültig. Läuft gedrosselt bei Seitenaufrufen.
 */
export async function syncExits(force = false) {
  const today = todayISO();
  if (!force && state.__exitsDay === today && state.__exitsSyncedAt && Date.now() - state.__exitsSyncedAt < TTL_MS) return;
  const exited = await prisma.user.findMany({ where: { exitDate: { lt: today }, active: true }, select: { id: true } });
  if (exited.length) {
    const ids = exited.map((u) => u.id);
    await prisma.$transaction([
      prisma.user.updateMany({ where: { id: { in: ids } }, data: { active: false, sessionVersion: { increment: 1 } } }),
      prisma.authToken.updateMany({ where: { userId: { in: ids }, usedAt: null }, data: { usedAt: new Date() } }),
    ]);
  }
  state.__exitsSyncedAt = Date.now();
  state.__exitsDay = today;
}

/** Offene Anträge, die nach dem Austritt beginnen, zurückziehen. */
export async function dropLeavesAfterExit(userId: string, exitDate: string) {
  return prisma.leaveRequest.deleteMany({ where: { userId, status: "PENDING", startDate: { gt: exitDate } } });
}
