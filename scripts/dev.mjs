// Entwicklung: lokale DB starten, Migrationen anwenden, dann `next dev`.
import { execSync, spawn } from "node:child_process";
import { startDb } from "./db.mjs";

const pg = await startDb();
execSync("npx prisma migrate deploy", { stdio: "inherit" });

const next = spawn("npx", ["next", "dev", ...process.argv.slice(2)], { stdio: "inherit" });
let stopping = false;
const stop = async (code = 0) => {
  if (stopping) return;
  stopping = true;
  next.kill("SIGTERM");
  await pg.stop();
  process.exit(code);
};
next.on("exit", (code) => stop(code ?? 0));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
