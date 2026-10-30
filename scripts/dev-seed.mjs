// Nur für die lokale Entwicklung: legt ein Demo-Konto an, mit dem sich die App im Browser prüfen lässt.
//   npm run db:demo   →  Login: demo-admin@teamzeit.test / Demo-Passwort-2026
// Läuft nur gegen eine Datenbank auf localhost.
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL ?? "";
if (process.env.NODE_ENV === "production" || !/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("Demo-Daten nur für eine lokale Datenbank.");
  process.exit(1);
}

const prisma = new PrismaClient();
const email = "demo-admin@teamzeit.test";
const passwordHash = await bcrypt.hash("Demo-Passwort-2026", 10);
await prisma.user.upsert({
  where: { email },
  update: { passwordHash, active: true, mustChangePassword: false, accessWithoutEmployment: true },
  create: { email, name: "Demo Admin", role: "ADMIN", passwordHash, passwordSetAt: new Date(), mustChangePassword: false, accessWithoutEmployment: true },
});
console.log(`Demo-Konto ${email} bereit.`);
await prisma.$disconnect();
