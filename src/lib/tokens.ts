import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./db";
import { todayISO } from "./dates";

export const TOKEN_DAYS = { INVITE: 7, RESET: 3 } as const;
export type TokenPurpose = keyof typeof TOKEN_DAYS;

export const hashToken = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Erzeugt einen neuen Einmal-Link; ältere offene Links derselben Person werden ungültig. */
export async function createAuthLink(userId: string, purpose: TokenPurpose) {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_DAYS[purpose] * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.authToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.authToken.create({ data: { userId, purpose, tokenHash: hashToken(raw), expiresAt } }),
  ]);
  return { url: `${await baseUrl()}/einladung/${raw}`, expiresAt };
}

/** Gültiges, unbenutztes Token samt Person – sonst null. */
export async function findValidToken(raw: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(raw)) return null;
  const token = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
  if (!token || token.usedAt || token.expiresAt < new Date() || !token.user.active || token.user.anonymizedAt) return null;
  if (token.user.exitDate && token.user.exitDate < todayISO()) return null;
  return token;
}

async function baseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
