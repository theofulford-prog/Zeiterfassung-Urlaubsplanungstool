// Legt beim Start die ersten Konten an, falls es sie noch nicht gibt.
//   INITIAL_ADMINS="mail1@firma.de:Vorname Nachname,mail2@firma.de:Vorname Nachname"   → Rolle Admin
//   INITIAL_GF="mail3@firma.de:Vorname Nachname"                                         → Rolle Geschäftsführung
//   INITIAL_ADMIN_PASSWORD="Startpasswort"   (gilt für alle, muss beim ersten Login geändert werden)
// Bereits vorhandene Konten werden nie verändert – ein Neustart setzt also kein Passwort zurück.
// (Weiterhin unterstützt: ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME für ein einzelnes Konto.)
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const parse = (value, role) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [email, ...name] = s.split(":");
      return { email: email.trim().toLowerCase(), name: name.join(":").trim() || email.split("@")[0], role, password: process.env.INITIAL_ADMIN_PASSWORD };
    });
const list = [...parse(process.env.INITIAL_ADMINS, "ADMIN"), ...parse(process.env.INITIAL_GF, "GF")];
if (process.env.ADMIN_EMAIL) {
  list.push({ email: process.env.ADMIN_EMAIL.trim().toLowerCase(), name: process.env.ADMIN_NAME ?? "Geschäftsführung", role: "ADMIN", password: process.env.ADMIN_PASSWORD });
}

try {
  for (const a of list) {
    if (await prisma.user.findUnique({ where: { email: a.email } })) {
      console.log(`Konto ${a.email} vorhanden.`);
      continue;
    }
    if (!a.password || a.password.length < 8) {
      console.warn(`Konto ${a.email} fehlt, aber kein Startpasswort (mind. 8 Zeichen) gesetzt.`);
      continue;
    }
    await prisma.user.create({
      data: {
        email: a.email, name: a.name, role: a.role,
        passwordHash: await bcrypt.hash(a.password, 10),
        passwordSetAt: new Date(), mustChangePassword: true, accessWithoutEmployment: true,
        // Admins/GF erfassen standardmäßig keine Arbeitszeit; bei Bedarf auf der Personenseite einschalten.
        tracksTime: false,
      },
    });
    console.log(`${a.role === "ADMIN" ? "Admin" : "GF"} ${a.email} angelegt (Passwort muss beim ersten Login geändert werden).`);
  }
  if ((await prisma.user.count({ where: { role: "ADMIN", active: true } })) === 0) {
    console.warn("Kein aktiver Admin vorhanden. INITIAL_ADMINS und INITIAL_ADMIN_PASSWORD setzen und neu starten.");
  }
} finally {
  await prisma.$disconnect();
}
