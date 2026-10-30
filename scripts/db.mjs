// Lokale PostgreSQL-Datenbank ohne Docker (Daten in .pgdata/).
//   npm run db:start   → startet die DB und läuft bis Strg+C
// Verbindung: postgresql://teamzeit:teamzeit@localhost:5433/teamzeit
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, ".pgdata");

export async function startDb() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "teamzeit",
    password: "teamzeit",
    port: 5433,
    persistent: true,
    onLog: () => {},
  });
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase("teamzeit");
  } catch (e) {
    if (!String(e?.message ?? e).includes("already exists")) throw e;
  }
  return pg;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pg = await startDb();
  console.log("PostgreSQL läuft auf localhost:5433 (Strg+C beendet).");
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 1 << 30);
}
