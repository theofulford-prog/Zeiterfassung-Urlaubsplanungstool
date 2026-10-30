# Stufe 1 · Teil A: Datenfundament – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TeamZeit läuft auf PostgreSQL und kennt Gesellschaften, Arbeitsverhältnisse mit Konditionen-Historie, eine verschlüsselte Personalakte und ein Änderungsprotokoll. Soll, Urlaub und Kosten werden je Arbeitsverhältnis berechnet.

**Architecture:** Fachregeln liegen als reine Funktionen in `src/lib/*.ts` (ohne Datenbank, mit Vitest getestet). Server Actions und Seiten laden Daten über Prisma und rufen diese Funktionen auf. Das Schema wird zuerst additiv erweitert, dann wird umverdrahtet, zum Schluss werden die alten Felder an `User` entfernt – so bleibt jeder Task lauffähig.

**Tech Stack:** Next.js 15.5.28 (App Router, Server Actions), React 19.1.1, Prisma 6.19.3, PostgreSQL 17 (lokal über `embedded-postgres`), Tailwind 4.1.13, Vitest 4.1.11, Node ≥ 20 (lokal 24).

**Spec:** `docs/superpowers/specs/2026-10-29-personaltool-stufe1-design.md` (Abschnitte 3.1, 3.2, 3.7 teilweise, 3.8 Protokoll, 3.9 Datenbank/Verschlüsselung)

## Einordnung: Stufe 1 in fünf Teilplänen

Die Spec ist für einen Plan zu groß. Jeder Teil ergibt lauffähige Software, der nächste Plan wird erst nach Abschluss des vorigen geschrieben.

| Teil | Inhalt | Spec |
|---|---|---|
| **A (dieser Plan)** | PostgreSQL, Tests, Gesellschaften, Arbeitsverhältnisse + Konditionen, Personalakte, Protokoll inkl. Lesezugriffe, Rechnen je Arbeitsverhältnis, Personen ohne Login | 3.1, 3.2, 3.7 (teilweise), 3.8 (Protokoll), 3.9 (DB, Verschlüsselung) |
| B | Organisation (Bereiche/Teams, Leitung/Vertretung datiert), fachliche Rollen mit Gesellschafts-Einschränkung, Führungskraft-Rechte, Admin ohne HR-Einblick, Zwei-Faktor | 3.3, 3.4 |
| C | Aufgabenliste, Freigabe-Logik mit Vertretung, Erinnerungen/Eskalation, E-Mail-Warteschlange, tägliche Läufe, Self-Service-Änderungsanträge | 3.2 (Self-Service), 3.5, 3.6 |
| D | Monatsabschluss neu, Erfassung durch Leitung, ArbZG über alle Arbeitsverhältnisse | 3.7 |
| E | Datenauskunft, Löschfristen, Azure-Betrieb (Datenbank, E-Mail, Zeitsteuerung), DSGVO-Entwürfe | 3.8, 3.9, 3.10 |

## Global Constraints

- Keine neuen Laufzeit-Abhängigkeiten in Teil A. Neue Dev-Abhängigkeiten nur `vitest@4.1.11` und `embedded-postgres@17.10.0-beta.17` (exakte Versionen).
- Oberfläche auf Deutsch, bestehende Optik und Bausteine (`ActionForm`, `Disclosure`, `PageHeader`, CSS-Klassen `input`, `label`, `card`). Keine Texte, Designs oder Gestaltungselemente von Personio übernehmen.
- Kalendertage sind überall `"YYYY-MM-DD"`-Strings; Feiertage NRW (`holidayName` in `src/lib/dates.ts`).
- Jede Server Action prüft zuerst Anmeldung und Recht (`requireUser` / `requirePermission` / `can`).
- Kostensatz, Gehalt und Personalkosten nur sichtbar mit `costs.view` oder `personnel.view`.
- Krankheit nur als Zeitraum – kein Feld für Diagnose oder Grund. Steuerklasse und Konfession werden nicht erfasst.
- Steuer-ID, Sozialversicherungsnummer und IBAN werden nur verschlüsselt gespeichert und im Protokoll nur als „geändert“ vermerkt, nie mit Werten.
- Neue Konditionen verändern vergangene Kosten nicht: `TimeEntry.costRate` bleibt der Satz zum Buchungstag. Einzige Ausnahme (heutiges Verhalten): Buchungen mit `costRate = 0` im Gültigkeitszeitraum neuer Konditionen werden mit deren Satz nachbewertet.
- Keine Datenübernahme: TeamZeit ist nirgends live; die SQLite-Migrationen werden durch eine PostgreSQL-Grundmigration ersetzt.
- Commits enden mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Person mit zwei Arbeitsverhältnissen bucht an einem Tag, an dem nur eines besteht → Buchung geht ohne Rückfrage auf das bestehende (Test in Task 5).
2. Konditionen wechseln mitten im Monat → Soll des Monats wird anteilig mit beiden Konditionen gerechnet, nicht nur mit den aktuellen (Test in Task 4).
3. Eines von zwei Arbeitsverhältnissen endet → Zugang bleibt; erst nach Ende des letzten wird gesperrt (Test in Task 5).
4. Person ohne Login (keine E-Mail, kein Passwort) → Anmeldung wird mit klarer Meldung abgelehnt, Listen und Exporte funktionieren (Test in Task 14).
5. `PII_ENCRYPTION_KEY` fehlt oder ist falsch → Speichern der Personalakte bricht mit klarer Meldung ab, es wird nie Klartext gespeichert (Test in Task 7).

---

### Task 1: Branch, Test-Runner und PostgreSQL lokal

**Vorbedingung:** Die offenen Änderungen auf `main` sind committet (Freigabe durch den Nutzer).

**Files:**
- Modify: `package.json`, `.env.example`, `.gitignore`, `prisma/schema.prisma` (nur `datasource`)
- Delete: `prisma/migrations/*` (alle SQLite-Migrationen inkl. `migration_lock.toml`)
- Create: `vitest.config.ts`, `scripts/db.mjs`, `scripts/dev.mjs`, `src/lib/dates.test.ts`, `prisma/migrations/<ts>_init/`

**Interfaces:**
- Produces: `npm test` (Vitest, Dateien `src/**/*.test.ts`, Alias `@` → `src`), `npm run dev` (startet DB + Next), `npm run db:start` (nur DB, läuft bis Strg+C). Lokale DB: `postgresql://teamzeit:teamzeit@localhost:5433/teamzeit`, Datenordner `.pgdata/`.

- [ ] **Step 1:** `git switch -c stufe1/teil-a-datenfundament`
- [ ] **Step 2:** `npm install -D vitest@4.1.11 embedded-postgres@17.10.0-beta.17`
- [ ] **Step 3: Write a smoke test** `src/lib/dates.test.ts` (prüft nur, dass der Test-Runner läuft)

```ts
import { describe, expect, it } from "vitest";
import { countWorkdays } from "./dates";

describe("countWorkdays", () => {
  it("zählt Weihnachten in NRW nicht mit", () => {
    expect(countWorkdays("2026-12-21", "2026-12-27")).toBe(4);
  });
});
```

- [ ] **Step 4:** `vitest.config.ts` anlegen (environment `node`, `include: ["src/**/*.test.ts"]`, `resolve.alias` `@` → `./src`) und Skript `"test": "vitest run"` ergänzen.
- [ ] **Step 5:** Run `npm test` → Expected: 1 passed.
- [ ] **Step 6:** `scripts/db.mjs`: exportiert `startDb(): Promise<EmbeddedPostgres>` – initialisiert `.pgdata/` nur, wenn `.pgdata/PG_VERSION` fehlt, startet auf Port 5433 (User/Passwort `teamzeit`), legt Datenbank `teamzeit` an (Fehler „existiert schon“ ignorieren). Direkt ausgeführt startet es die DB und stoppt sie bei SIGINT/SIGTERM.
- [ ] **Step 7:** `scripts/dev.mjs`: `startDb()` → `npx prisma migrate deploy` → `next dev` als Kindprozess mit `stdio: "inherit"`; bei Ende von Next oder SIGINT DB stoppen.
- [ ] **Step 8:** `package.json`-Skripte: `"dev": "node scripts/dev.mjs"`, `"dev:next": "next dev"`, `"db:start": "node scripts/db.mjs"`, `"start:azure": "prisma migrate deploy && node scripts/ensure-admin.mjs && next start"`. `.gitignore` += `.pgdata`. `.env.example`: `DATABASE_URL="postgresql://teamzeit:teamzeit@localhost:5433/teamzeit"` mit Kommentar für Azure (`?sslmode=require`).
- [ ] **Step 9:** `datasource db { provider = "postgresql" }`, alte Migrationen löschen, in zweitem Terminal `npm run db:start`, dann `npx prisma migrate dev --name init`. Expected: neue Migration angelegt, Prisma Client generiert.
- [ ] **Step 10:** Run `npm run typecheck && npm test`, dann `npm run dev` und `npm run db:admins` (mit `.env` aus `.env.example`). Expected: Login unter http://localhost:3000 funktioniert mit dem Startkonto.
- [ ] **Step 11: Commit** – `git add -A && git commit -m "chore: PostgreSQL lokal, Vitest, neue Grundmigration"`

---

### Task 2: Arbeitstage je Vertrag

**Files:**
- Modify: `src/lib/dates.ts`
- Test: `src/lib/dates.test.ts`

**Interfaces:**
- Produces: `isoWeekday(s: string): number` (Mo=1 … So=7), `isWorkdayFor(s: string, workDays: readonly number[]): boolean` (Wochentag enthalten und kein Feiertag), `countWorkdaysFor(from: string, to: string, workDays: readonly number[]): number` (0 bei `to < from`). Bestehende `isWorkday`/`countWorkdays` (Mo–Fr) bleiben für Teamkalender und Antragsanzeige.

- [ ] **Step 1: Write the failing tests**

```ts
describe("Arbeitstage je Vertrag", () => {
  it("Wochentag nach ISO", () => {
    expect(isoWeekday("2026-11-02")).toBe(1);
    expect(isoWeekday("2026-11-08")).toBe(7);
  });
  it("Mo–Do-Woche zählt vier Tage", () => {
    expect(countWorkdaysFor("2026-11-02", "2026-11-08", [1, 2, 3, 4])).toBe(4);
  });
  it("Feiertag fällt auch bei eigenem Muster weg", () => {
    expect(countWorkdaysFor("2026-12-21", "2026-12-27", [1, 2, 3, 4, 5])).toBe(4);
    expect(countWorkdaysFor("2026-12-21", "2026-12-27", [5])).toBe(0);
  });
  it("ohne Arbeitstage nie ein Arbeitstag", () => {
    expect(countWorkdaysFor("2026-11-02", "2026-11-08", [])).toBe(0);
    expect(isWorkdayFor("2026-11-02", [])).toBe(false);
  });
});
```

- [ ] **Step 2:** Run `npm test` → Expected: FAIL (`isoWeekday` not exported).
- [ ] **Step 3:** Die drei Funktionen in `src/lib/dates.ts` ergänzen.
- [ ] **Step 4:** Run `npm test` → Expected: PASS.
- [ ] **Step 5: Commit** – `feat: Arbeitstage je Vertrag (Wochentagsmuster)`

---

### Task 3: Konditionen-Historie

**Files:**
- Create: `src/lib/terms.ts`, `src/lib/terms.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type TermsLike = { validFrom: string; weeklyHours: number | null; workDays: number[]; vacationDaysPerYear: number; costRate: number };
  export function termsOn<T extends { validFrom: string }>(terms: readonly T[], date: string): T | null;   // jüngste mit validFrom <= date
  export function termSegments<T extends { validFrom: string }>(terms: readonly T[], from: string, to: string): { from: string; to: string; terms: T }[];
  ```
  `termSegments` deckt `[from, to]` lückenlos ab, soweit Konditionen gelten; Tage vor der ersten `validFrom` fehlen. Eingabe muss nicht sortiert sein.

- [ ] **Step 1: Write the failing tests**

```ts
const t1 = { validFrom: "2026-01-01", id: "a" };
const t2 = { validFrom: "2026-09-15", id: "b" };

it("termsOn wählt die zum Tag gültigen Konditionen", () => {
  expect(termsOn([t2, t1], "2025-12-31")).toBeNull();
  expect(termsOn([t2, t1], "2026-09-14")?.id).toBe("a");
  expect(termsOn([t2, t1], "2026-09-15")?.id).toBe("b");
});
it("termSegments teilt einen Monat am Wechsel", () => {
  expect(termSegments([t2, t1], "2026-09-01", "2026-09-30").map((s) => [s.from, s.to, s.terms.id])).toEqual([
    ["2026-09-01", "2026-09-14", "a"],
    ["2026-09-15", "2026-09-30", "b"],
  ]);
});
it("termSegments beginnt frühestens mit der ersten Kondition", () => {
  expect(termSegments([t2], "2026-09-01", "2026-09-30").map((s) => s.from)).toEqual(["2026-09-15"]);
  expect(termSegments([], "2026-09-01", "2026-09-30")).toEqual([]);
});
```

- [ ] **Step 2:** Run `npm test` → Expected: FAIL.
- [ ] **Step 3:** `src/lib/terms.ts` implementieren.
- [ ] **Step 4:** Run `npm test` → Expected: PASS.
- [ ] **Step 5: Commit** – `feat: Konditionen mit Gültig-ab-Datum`

---

### Task 4: Soll und Urlaub je Arbeitsverhältnis

**Files:**
- Modify: `src/lib/stats.ts` (neue Funktionen ergänzen; alte bleiben bis Task 15)
- Test: `src/lib/stats.test.ts`

**Interfaces:**
- Consumes: `isWorkdayFor`, `countWorkdaysFor` (Task 2), `termSegments`, `termsOn`, `TermsLike` (Task 3), bestehender Typ `LeaveLike`.
- Produces:
  ```ts
  export type EmploymentLike = { id: string; startDate: string; endDate: string | null; carryoverDays: number; carryoverYear: number | null; terms: TermsLike[] };
  export function employmentTargetHours(emp: EmploymentLike, from: string, to: string, leaves: LeaveLike[]): number | null;
  export function personTargetHours(emps: EmploymentLike[], from: string, to: string, leaves: LeaveLike[]): number | null;
  export function employmentVacationAllowance(emp: EmploymentLike, year: number): number;
  export function employmentVacationBalance(emp: EmploymentLike, year: number, leaves: LeaveLike[]):
    { allowance: number; carryover: number; total: number; taken: number; pending: number; remaining: number };
  ```
- Regeln: Zeitraum wird auf `startDate..endDate` begrenzt. Tagessoll = `weeklyHours / workDays.length` der am Tag gültigen Konditionen. Genehmigte Abwesenheiten jeder Art senken das Soll an Arbeitstagen des Vertrags (halber Tag = 0,5; Überschneidungen zählen einmal). `weeklyHours = null` → kein Soll; `employmentTargetHours` gibt `null` zurück, wenn kein Abschnitt ein Soll hat. `personTargetHours` summiert die Nicht-`null`-Werte, `null` wenn alle `null` sind oder keine Arbeitsverhältnisse existieren. Urlaubsanspruch: je vollem Beschäftigungsmonat 1/12 der zum Monatsersten gültigen `vacationDaysPerYear`, Summe auf halbe Tage aufgerundet. Genommen/beantragt: Urlaubstage an Arbeitstagen des Vertrags, ohne Tage mit genehmigter Krankheit (§ 9 BUrlG). Resturlaub zählt nur, wenn `carryoverYear === year`.

- [ ] **Step 1: Write the failing tests** (alle im September 2026: keine Feiertage, 22 Arbeitstage Mo–Fr)

```ts
const t = (validFrom: string, weeklyHours: number | null, workDays = [1, 2, 3, 4, 5], vacationDaysPerYear = 30) =>
  ({ validFrom, weeklyHours, workDays, vacationDaysPerYear, costRate: 0 });
const emp = (over: Partial<EmploymentLike> = {}): EmploymentLike =>
  ({ id: "e", startDate: "2026-01-01", endDate: null, carryoverDays: 0, carryoverYear: null, terms: [t("2026-01-01", 40)], ...over });
const vac = (startDate: string, endDate: string, status = "APPROVED") => ({ startDate, endDate, status, type: "VACATION" });
const S = "2026-09-01", E = "2026-09-30";

it("Konditionswechsel mitten im Monat", () => {
  expect(employmentTargetHours(emp({ terms: [t("2026-01-01", 40), t("2026-09-15", 20)] }), S, E, [])).toBe(128);
});
it("Mo–Do-Vertrag", () => {
  expect(employmentTargetHours(emp({ terms: [t("2026-01-01", 32, [1, 2, 3, 4])] }), S, E, [])).toBe(144);
});
it("Eintritt und Austritt begrenzen das Soll", () => {
  expect(employmentTargetHours(emp({ startDate: "2026-09-15", terms: [t("2026-09-15", 40)] }), S, E, [])).toBe(96);
  expect(employmentTargetHours(emp({ endDate: "2026-09-10" }), S, E, [])).toBe(64);
});
it("Urlaub senkt das Soll", () => {
  expect(employmentTargetHours(emp(), S, E, [vac("2026-09-07", "2026-09-11")])).toBe(136);
});
it("ohne Wochenstunden kein Soll", () => {
  expect(employmentTargetHours(emp({ terms: [t("2026-01-01", null)] }), S, E, [])).toBeNull();
  expect(personTargetHours([emp({ terms: [t("2026-01-01", null)] }), emp()], S, E, [])).toBe(176);
  expect(personTargetHours([], S, E, [])).toBeNull();
});
it("Urlaubsanspruch anteilig und bei Konditionswechsel", () => {
  expect(employmentVacationAllowance(emp(), 2026)).toBe(30);
  expect(employmentVacationAllowance(emp({ startDate: "2026-09-15", terms: [t("2026-09-15", 40)] }), 2026)).toBe(7.5);
  expect(employmentVacationAllowance(emp({ terms: [t("2026-01-01", 40), t("2026-07-01", 32, [1, 2, 3, 4], 24)] }), 2026)).toBe(27);
});
it("Urlaubstage nach Arbeitstagen des Vertrags, Krankheit im Urlaub zählt nicht", () => {
  const week = [vac("2026-09-07", "2026-09-11")];
  expect(employmentVacationBalance(emp(), 2026, week).taken).toBe(5);
  expect(employmentVacationBalance(emp({ terms: [t("2026-01-01", 32, [1, 2, 3, 4])] }), 2026, week).taken).toBe(4);
  const sick = { startDate: "2026-09-09", endDate: "2026-09-09", status: "APPROVED", type: "SICK" };
  expect(employmentVacationBalance(emp(), 2026, [...week, sick]).taken).toBe(4);
});
it("Resturlaub nur im zugehörigen Jahr", () => {
  const e = emp({ carryoverDays: 3, carryoverYear: 2026 });
  expect(employmentVacationBalance(e, 2026, []).total).toBe(33);
  expect(employmentVacationBalance(e, 2027, []).total).toBe(30);
});
```

- [ ] **Step 2:** Run `npm test` → Expected: FAIL.
- [ ] **Step 3:** Funktionen in `src/lib/stats.ts` implementieren.
- [ ] **Step 4:** Run `npm test` → Expected: PASS.
- [ ] **Step 5: Commit** – `feat: Soll und Urlaubskonto je Arbeitsverhältnis`

---

### Task 5: Regeln für Arbeitsverhältnisse und Zugang

**Files:**
- Create: `src/lib/employment.ts`, `src/lib/employment.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const CONTRACT_TYPES = { PERMANENT: "Unbefristet", FIXED_TERM: "Befristet", MINIJOB: "Minijob", WORKING_STUDENT: "Werkstudent:in", APPRENTICE: "Ausbildung", INTERN: "Praktikum" } as const;
  export type ContractType = keyof typeof CONTRACT_TYPES;
  type Span = { id: string; startDate: string; endDate: string | null };
  export function isEmployedOn(emp: Span, date: string): boolean;
  export function activeEmploymentsOn<T extends Span>(emps: readonly T[], date: string): T[];
  export function resolveEmployment<T extends Span>(emps: readonly T[], date: string, requestedId?: string | null): T | string;  // string = Fehlermeldung
  export function hasAccessOn(user: { accessWithoutEmployment: boolean }, emps: readonly Span[], date: string): boolean;
  ```
- `hasAccessOn`: wahr bei `accessWithoutEmployment`, sonst wenn irgendein Arbeitsverhältnis noch nicht beendet ist (`endDate` leer oder ≥ `date`) – auch ein künftiges (Zugang vor dem ersten Arbeitstag erlaubt).
- Fehlermeldungen (`formatDate` aus `dates.ts`): „Am 01.10.2026 besteht kein Arbeitsverhältnis.“ · „Bitte das Arbeitsverhältnis wählen.“ · „Dieses Arbeitsverhältnis besteht am 01.10.2026 nicht.“

- [ ] **Step 1: Write the failing tests**

```ts
const a = { id: "a", startDate: "2026-01-01", endDate: "2026-06-30" };
const b = { id: "b", startDate: "2026-01-01", endDate: null };
const later = { id: "c", startDate: "2026-12-01", endDate: null };

it("bucht ohne Rückfrage auf das einzige bestehende Arbeitsverhältnis", () => {
  expect(resolveEmployment([a, b], "2026-10-01")).toBe(b);
});
it("fragt bei zwei bestehenden nach", () => {
  expect(resolveEmployment([a, b], "2026-03-01")).toBe("Bitte das Arbeitsverhältnis wählen.");
  expect(resolveEmployment([a, b], "2026-03-01", "a")).toBe(a);
});
it("lehnt beendete oder fehlende Arbeitsverhältnisse ab", () => {
  expect(resolveEmployment([a, b], "2026-10-01", "a")).toBe("Dieses Arbeitsverhältnis besteht am 01.10.2026 nicht.");
  expect(resolveEmployment([a], "2026-10-01")).toBe("Am 01.10.2026 besteht kein Arbeitsverhältnis.");
  expect(resolveEmployment([later], "2026-11-15")).toBe("Am 15.11.2026 besteht kein Arbeitsverhältnis.");
});
it("Zugang endet erst mit dem letzten Arbeitsverhältnis", () => {
  const u = { accessWithoutEmployment: false };
  expect(hasAccessOn(u, [a], "2026-06-30")).toBe(true);
  expect(hasAccessOn(u, [a], "2026-07-01")).toBe(false);
  expect(hasAccessOn(u, [a, b], "2026-10-01")).toBe(true);
  expect(hasAccessOn(u, [later], "2026-11-15")).toBe(true);
  expect(hasAccessOn(u, [], "2026-11-15")).toBe(false);
  expect(hasAccessOn({ accessWithoutEmployment: true }, [], "2026-11-15")).toBe(true);
});
```

- [ ] **Step 2:** Run `npm test` → Expected: FAIL.
- [ ] **Step 3:** `src/lib/employment.ts` implementieren.
- [ ] **Step 4:** Run `npm test` → Expected: PASS.
- [ ] **Step 5: Commit** – `feat: Regeln für Arbeitsverhältnisse und Zugang`

---

### Task 6: Datenmodell erweitern (additiv)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<ts>_personal_fundament/`

**Interfaces:**
- Produces (Prisma-Modelle, Kommentare im Schema auf Deutsch wie bisher):
  - `Company { id, name @unique, shortName String?, active Boolean @default(true), createdAt, employments Employment[] }`
  - `Employment { id, userId, companyId, contractType String, jobTitle String?, personnelNumber String?, startDate String, endDate String?, probationEndDate String?, fixedTermEndDate String?, carryoverDays Float @default(0), carryoverYear Int?, createdAt, terms EmploymentTerms[], timeEntries TimeEntry[], workDays WorkDay[] }` – `user` mit `onDelete: Cascade`, `company` mit `onDelete: Restrict`, `@@unique([companyId, personnelNumber])`, `@@index([userId])`
  - `EmploymentTerms { id, employmentId, validFrom String, weeklyHours Float?, workDays Int[], vacationDaysPerYear Float, payType String, payAmount Float?, costRate Float @default(0), createdAt, createdById String? }` – `@@unique([employmentId, validFrom])`, `onDelete: Cascade`
  - `PersonalRecord { userId @id, birthDate String?, street String?, postalCode String?, city String?, phone String?, privateEmail String?, emergencyName String?, emergencyPhone String?, emergencyRelation String?, healthInsurance String?, taxIdEnc String?, socialSecurityEnc String?, ibanEnc String?, accountHolder String?, updatedAt @updatedAt }` – `onDelete: Cascade`
  - `AuditLog { id, at DateTime @default(now()), actorId String?, action String, entityType String, entityId String, subjectUserId String?, changes Json?, reason String? }` – `@@index([subjectUserId, at])`, `@@index([entityType, entityId])`; bewusst ohne Fremdschlüssel
  - `User` += `accessWithoutEmployment Boolean @default(false)`, Relationen `employments`, `personalRecord`
  - `TimeEntry` += `employmentId String?` (+ Relation, `onDelete: Restrict`); `WorkDay` += `employmentId String?` (+ Relation, `onDelete: Cascade`). Pflichtfeld wird es erst in Task 15.

- [ ] **Step 1:** Schema ergänzen, `npx prisma migrate dev --name personal_fundament` (DB läuft).
- [ ] **Step 2:** Run `npm run typecheck && npm test && npm run build` → Expected: alles grün (rein additiv).
- [ ] **Step 3: Commit** – `feat: Datenmodell für Gesellschaften, Arbeitsverhältnisse, Personalakte, Protokoll`

---

### Task 7: Verschlüsselung und Prüfung der Lohndaten

**Files:**
- Create: `src/lib/crypto.ts`, `src/lib/crypto.test.ts`, `src/lib/validate.ts`, `src/lib/validate.test.ts`
- Modify: `.env.example` (`PII_ENCRYPTION_KEY` mit Hinweis `openssl rand -base64 32`)

**Interfaces:**
- Produces:
  ```ts
  // crypto.ts – AES-256-GCM, Schlüssel = base64 von 32 Byte aus process.env.PII_ENCRYPTION_KEY, bei jedem Aufruf gelesen
  export function encryptField(plain: string): string;   // "v1:<iv b64>:<tag b64>:<ciphertext b64>"
  export function decryptField(enc: string): string;     // wirft bei Manipulation oder falschem Schlüssel
  export function maskValue(value: string): string;      // "•••• " + letzte 4 Zeichen
  // validate.ts
  export function normalizeIban(s: string): string;      // ohne Leerzeichen, Großbuchstaben
  export function isValidIban(s: string): boolean;       // Prüfziffer mod 97
  export function isValidTaxId(s: string): boolean;      // 11 Ziffern, erste ≠ 0
  export function isValidSocialSecurityNumber(s: string): boolean;  // /^\d{8}[A-Z]\d{3}$/ nach Großschreibung
  ```
- Fehlender oder ungültiger Schlüssel: `throw new Error("PII_ENCRYPTION_KEY fehlt oder ist ungültig")`.

- [ ] **Step 1: Write the failing tests**

```ts
// crypto.test.ts
beforeEach(() => { process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64"); });
it("verschlüsselt umkehrbar und jedes Mal anders", () => {
  const a = encryptField("DE89370400440532013000");
  expect(a.startsWith("v1:")).toBe(true);
  expect(a).not.toBe(encryptField("DE89370400440532013000"));
  expect(decryptField(a)).toBe("DE89370400440532013000");
});
it("erkennt Manipulation", () => {
  const [v, iv, tag, ct] = encryptField("x").split(":");
  expect(() => decryptField([v, iv, tag, Buffer.from("y").toString("base64")].join(":"))).toThrow();
});
it("speichert ohne Schlüssel nie Klartext", () => {
  delete process.env.PII_ENCRYPTION_KEY;
  expect(() => encryptField("x")).toThrow("PII_ENCRYPTION_KEY fehlt oder ist ungültig");
  process.env.PII_ENCRYPTION_KEY = "zu-kurz";
  expect(() => encryptField("x")).toThrow("PII_ENCRYPTION_KEY fehlt oder ist ungültig");
});
it("maskiert", () => { expect(maskValue("DE89370400440532013000")).toBe("•••• 3000"); });

// validate.test.ts
it("IBAN", () => {
  expect(normalizeIban(" de89 3704 0044 0532 0130 00 ")).toBe("DE89370400440532013000");
  expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
  expect(isValidIban("DE89370400440532013001")).toBe(false);
});
it("Steuer-ID und SV-Nummer", () => {
  expect(isValidTaxId("12345678901")).toBe(true);
  expect(isValidTaxId("02345678901")).toBe(false);
  expect(isValidSocialSecurityNumber("12345678a123")).toBe(true);
  expect(isValidSocialSecurityNumber("12345678123")).toBe(false);
});
```

- [ ] **Step 2:** Run `npm test` → Expected: FAIL.
- [ ] **Step 3:** Beide Module mit `node:crypto` implementieren.
- [ ] **Step 4:** Run `npm test` → Expected: PASS.
- [ ] **Step 5: Commit** – `feat: Verschlüsselung und Prüfung von Lohndaten`

---

### Task 8: Änderungsprotokoll

**Files:**
- Create: `src/lib/audit-diff.ts`, `src/lib/audit-diff.test.ts`, `src/lib/audit.ts` (`import "server-only"`), `src/lib/audit-labels.ts`

**Interfaces:**
- Produces:
  ```ts
  // audit-diff.ts (rein)
  export type Changes = Record<string, { from: unknown; to: unknown } | { changed: true }>;
  export const SENSITIVE_FIELDS: readonly string[];   // ["taxIdEnc", "socialSecurityEnc", "ibanEnc"]
  export function diffChanges(before: Record<string, unknown> | null, after: Record<string, unknown>,
    opts?: { sensitive?: readonly string[]; ignore?: readonly string[] }): Changes;
  // audit.ts
  export type AuditAction = "person.create" | "person.update" | "company.create" | "company.update"
    | "employment.create" | "employment.update" | "terms.create" | "terms.delete" | "personal.update" | "personal.read";
  export async function audit(e: { actorId: string | null; action: AuditAction; entityType: string; entityId: string;
    subjectUserId?: string | null; changes?: Changes | null; reason?: string | null }, tx?: Prisma.TransactionClient): Promise<void>;
  // audit-labels.ts
  export const AUDIT_ACTION_LABELS: Record<AuditAction, string>;  // z. B. "terms.create": "Neue Konditionen"
  export const FIELD_LABELS: Record<string, string>;              // z. B. weeklyHours: "Wochenstunden", ibanEnc: "Bankverbindung"
  ```
- `diffChanges`: ignoriert standardmäßig `id`, `createdAt`, `updatedAt` und `passwordHash`; `Date` wird über `toISOString()`, Arrays und Objekte über `JSON.stringify` verglichen; `SENSITIVE_FIELDS` sind immer sensibel; bei `before = null` erscheinen nur Felder mit Wert ≠ `null`.

- [ ] **Step 1: Write the failing tests**

```ts
it("nur geänderte Felder", () => {
  expect(diffChanges({ a: 1, b: "x" }, { a: 1, b: "y" })).toEqual({ b: { from: "x", to: "y" } });
  expect(diffChanges({ workDays: [1, 2] }, { workDays: [1, 2] })).toEqual({});
});
it("sensible Felder ohne Werte", () => {
  expect(diffChanges({ ibanEnc: "v1:a" }, { ibanEnc: "v1:b" })).toEqual({ ibanEnc: { changed: true } });
});
it("Neuanlage und ignorierte Felder", () => {
  expect(diffChanges(null, { name: "A", note: null, updatedAt: new Date() })).toEqual({ name: { from: null, to: "A" } });
});
```

- [ ] **Step 2:** Run `npm test` → Expected: FAIL.
- [ ] **Step 3:** Module implementieren; `audit()` schreibt einen `AuditLog`-Eintrag über `tx ?? prisma`.
- [ ] **Step 4:** Run `npm test && npm run typecheck` → Expected: PASS.
- [ ] **Step 5: Commit** – `feat: Änderungsprotokoll`

---

### Task 9: Gesellschaften verwalten

**Files:**
- Modify: `src/lib/permissions.ts`, `src/components/nav.tsx`, `src/app/(app)/mehr/page.tsx`
- Create: `src/app/actions/companies.ts`, `src/app/(app)/gesellschaften/page.tsx`

**Interfaces:**
- Consumes: `audit`, `diffChanges` (Task 8).
- Produces: Rechte in `PERMISSIONS` (gelten für alle folgenden Tasks; `DEFAULT_MATRIX.GF` bekommt alle vier, Admin hat ohnehin alle):
  - `"companies.manage": "Gesellschaften anlegen und bearbeiten"`
  - `"personnel.view": "Personalakten und Arbeitsverhältnisse anderer sehen (inkl. Lohndaten)"`
  - `"personnel.edit": "Personalakten, Arbeitsverhältnisse und Konditionen pflegen"`
  - `"audit.view": "Änderungsprotokoll sehen"`
  
  `PAGE_PERMISSIONS` += `["/gesellschaften", "companies.manage"]`. Action `saveCompany(_: FormState, form: FormData): Promise<FormState>` (Felder `id?`, `name`, `shortName`, `active`).
- Verhalten: Name Pflicht („Bitte einen Namen angeben.“), eindeutig (P2002 → „Diese Gesellschaft gibt es schon.“). Inaktive Gesellschaften bleiben sichtbar, sind aber für neue Arbeitsverhältnisse nicht wählbar. Liste zeigt je Gesellschaft die Zahl aktiver Arbeitsverhältnisse. Jede Anlage/Änderung → `audit` (`company.create`/`company.update`).

- [ ] **Step 1:** Rechte ergänzen, Seite + Action + Navigationseintrag „Gesellschaften“ (Desktop-Sidebar und „Mehr“) bauen.
- [ ] **Step 2:** Run `npm run typecheck && npm test && npm run build` → Expected: grün.
- [ ] **Step 3:** Im Browser (`npm run dev`) als Admin: die sechs Gesellschaften aus Spec Abschnitt 2 anlegen, eine umbenennen, doppelten Namen versuchen → Meldung erscheint.
- [ ] **Step 4: Commit** – `feat: Gesellschaften verwalten`

---

### Task 10: Arbeitsverhältnisse und Konditionen pflegen

**Files:**
- Create: `src/lib/terms-form.ts`, `src/lib/terms-form.test.ts`, `src/app/actions/employment.ts`, `src/app/(app)/mitarbeitende/[id]/employments-section.tsx`
- Modify: `src/app/(app)/mitarbeitende/[id]/page.tsx`, `src/components/user-form.tsx`, `src/app/actions/admin.ts` (Vertragsfelder aus `saveUser` entfernen), `src/lib/exits.ts`

**Interfaces:**
- Consumes: `CONTRACT_TYPES`, `hasAccessOn` (Task 5), `audit`, `diffChanges` (Task 8), Rechte aus Task 9.
- Produces:
  ```ts
  // terms-form.ts (rein)
  export type TermsInput = { validFrom: string; weeklyHours: number | null; workDays: number[]; vacationDaysPerYear: number;
    payType: "MONTHLY" | "HOURLY"; payAmount: number | null; costRate: number };
  export function parseTermsForm(form: FormData): TermsInput | string;
  // actions/employment.ts
  export async function saveEmployment(_: FormState, form: FormData): Promise<FormState>; // neu: inkl. erster Konditionen (validFrom = startDate)
  export async function addTerms(_: FormState, form: FormData): Promise<FormState>;
  export async function deleteTerms(form: FormData): Promise<void>;                       // nur die jüngsten, nie die einzigen
  ```
- Regeln: alle Actions verlangen `personnel.edit`. Formularfelder der Konditionen: `validFrom`, `weeklyHours` (leer = kein Soll, sonst > 0 und ≤ 60), `workDays` (Checkboxen 1–7), `vacationDaysPerYear` (0–60, halbe Tage), `payType`, `payAmount`, `costRate` (≥ 0). Arbeitsverhältnis: aktive Gesellschaft (bei Neuanlage), `endDate ≥ startDate`, keine zeitliche Überschneidung mit einem anderen Arbeitsverhältnis derselben Person bei derselben Gesellschaft („Bei dieser Gesellschaft besteht in diesem Zeitraum schon ein Arbeitsverhältnis.“). `validFrom ≥ startDate` und je Arbeitsverhältnis eindeutig. Neue Konditionen bewerten `TimeEntry` mit `costRate = 0` dieses Arbeitsverhältnisses ab `validFrom` (bis zur nächsten Kondition) nach. Endet durch Speichern das letzte Arbeitsverhältnis in der Vergangenheit und `hasAccessOn` ist falsch → sofort sperren wie heute (`active = false`, `sessionVersion + 1`, offene Links ungültig) und offene Anträge nach dem Ende zurückziehen (`dropLeavesAfterExit` mit dem spätesten `endDate`). Alles mit `audit`.
- Oberfläche: Personenseite erhält Abschnitt „Arbeitsverhältnisse“ (je Karte: Gesellschaft, Vertragsart, Zeitraum, Probezeit/Befristung, aktuelle Konditionen; Konditionen-Historie aufklappbar; Formulare „Konditionen ändern ab …“ und „Arbeitsverhältnis bearbeiten/beenden“; „Arbeitsverhältnis hinzufügen“). Kostensatz und Gehalt nur mit `costs.view` oder `personnel.view`. Personenformular verliert Wochenstunden, Urlaubstage, Resturlaub, Eintritt, Austritt, Kostensatz. Bis Task 12 rechnen Auswertungen noch mit den alten Standardwerten – auf dem Branch in Ordnung.

- [ ] **Step 1: Write the failing tests** (`terms-form.test.ts`)

```ts
const form = (o: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ validFrom: "2026-11-01", weeklyHours: "40", workDays: ["1", "2", "3", "4", "5"],
    vacationDaysPerYear: "30", payType: "MONTHLY", payAmount: "3200", costRate: "35", ...o }))
    for (const x of [v].flat()) f.append(k, x);
  return f;
};
it("liest gültige Konditionen", () => {
  expect(parseTermsForm(form({ weeklyHours: "38,5" }))).toMatchObject({ weeklyHours: 38.5, workDays: [1, 2, 3, 4, 5] });
  expect(parseTermsForm(form({ weeklyHours: "" }))).toMatchObject({ weeklyHours: null });
  expect(parseTermsForm(form({ vacationDaysPerYear: "27,5" }))).toMatchObject({ vacationDaysPerYear: 27.5 });
});
it("weist Ungültiges ab", () => {
  expect(parseTermsForm(form({ workDays: [] }))).toBe("Bitte mindestens einen Arbeitstag wählen.");
  expect(parseTermsForm(form({ weeklyHours: "61" }))).toBe("Wochenstunden dürfen höchstens 60 sein.");
  expect(parseTermsForm(form({ vacationDaysPerYear: "27,3" }))).toBe("Urlaubstage bitte in halben Tagen angeben.");
  expect(parseTermsForm(form({ validFrom: "2026-02-30" }))).toBe("Bitte ein gültiges Gültig-ab-Datum angeben.");
  expect(parseTermsForm(form({ payType: "WEEKLY" }))).toBe("Bitte eine gültige Vergütungsart wählen.");
});
```

- [ ] **Step 2:** Run `npm test` → Expected: FAIL.
- [ ] **Step 3:** `parseTermsForm` implementieren → Run `npm test` → Expected: PASS.
- [ ] **Step 4:** Actions, Abschnitt auf der Personenseite und gekürztes Personenformular bauen.
- [ ] **Step 5:** Run `npm run typecheck && npm run build` → Expected: grün. Im Browser: Person mit zwei Arbeitsverhältnissen (DBS Home GmbH, DBS Immobilienverwaltung GmbH) anlegen, Konditionen ab einem späteren Datum ändern, überlappendes Arbeitsverhältnis bei derselben Gesellschaft versuchen → Meldung.
- [ ] **Step 6: Commit** – `feat: Arbeitsverhältnisse und Konditionen-Historie pflegen`

---

### Task 11: Zeiterfassung und Zugang auf Arbeitsverhältnisse umstellen

**Files:**
- Create: `src/lib/people.ts` (`import "server-only"`)
- Modify: `src/app/actions/time.ts`, `src/components/quick-book.tsx`, `src/components/day-work.tsx`, `src/components/work-day-row.tsx`, `src/components/entry-row.tsx`, `src/app/(app)/zeiten/page.tsx`, `src/lib/auth.ts`, `src/lib/exits.ts`, `src/lib/tokens.ts`, `src/app/actions/auth.ts`, `prisma/schema.prisma` (WorkDay-Eindeutigkeit)

**Interfaces:**
- Consumes: `resolveEmployment`, `activeEmploymentsOn`, `hasAccessOn` (Task 5), `termsOn` (Task 3).
- Produces:
  ```ts
  // people.ts
  export type EmploymentFull = Employment & { company: Company; terms: EmploymentTerms[] };
  export async function loadEmployments(userIds: string[]): Promise<Map<string, EmploymentFull[]>>;  // terms nach validFrom sortiert
  export async function lastUsedEmploymentId(userId: string): Promise<string | null>;               // aus der jüngsten Buchung
  ```
- Regeln: `addTimeEntry`, `saveWorkDay`, `stampWork` lesen optional `employmentId` aus dem Formular und lösen über `resolveEmployment` auf; Fehlertext geht unverändert an die Oberfläche. `costRate` = `termsOn(emp.terms, date)?.costRate ?? 0`. `WorkDay` wird eindeutig je `[employmentId, date]` (Migration `workday_je_arbeitsverhaeltnis`). Formulare zeigen eine Auswahl „Gesellschaft“ nur, wenn die Person am gewählten Tag mehr als ein Arbeitsverhältnis hat; Vorauswahl = `lastUsedEmploymentId`. Bei zwei Arbeitsverhältnissen zeigt die Tagesansicht die Arbeitszeit je Gesellschaft. `requireUser`, Login, Einladungs-/Reset-Links und `syncExits` prüfen Zugang über `hasAccessOn` statt `user.exitDate`.

- [ ] **Step 1:** `people.ts` anlegen, Actions umstellen, Migration erzeugen.
- [ ] **Step 2:** Formulare/Komponenten um die Auswahl erweitern, Zugangsprüfungen umstellen.
- [ ] **Step 3:** Run `npm run typecheck && npm test && npm run build` → Expected: grün.
- [ ] **Step 4:** Im Browser: Person mit einem Arbeitsverhältnis bucht ohne Auswahl; Person mit zwei sieht die Auswahl und bucht auf beide; Stempeluhr funktioniert; Person, deren einziges Arbeitsverhältnis gestern endete, wird abgemeldet.
- [ ] **Step 5: Commit** – `feat: Buchungen und Arbeitszeit je Arbeitsverhältnis`

---

### Task 12: Auswertungen, Urlaub und Export je Arbeitsverhältnis

**Files:**
- Modify: `src/app/(app)/zeiten/page.tsx`, `src/app/(app)/urlaub/page.tsx`, `src/app/(app)/antraege/page.tsx`, `src/app/(app)/mitarbeitende/page.tsx`, `src/app/(app)/mitarbeitende/[id]/page.tsx`, `src/app/(app)/uebersicht/page.tsx`, `src/app/api/export/route.ts`

**Interfaces:**
- Consumes: `employmentTargetHours`, `personTargetHours`, `employmentVacationBalance` (Task 4), `loadEmployments`, `termsOn`.
- Regeln: Wochen-Soll/Ist in „Meine Zeiten“ über `personTargetHours`; „Mein Urlaub“ und „Anträge“ zeigen ein Urlaubskonto je Arbeitsverhältnis (Überschrift = Gesellschaft, bei nur einem ohne Überschrift). Personenseite: Monatstabelle summiert über alle Arbeitsverhältnisse, darunter Saldo je Arbeitsverhältnis; Ist je Arbeitsverhältnis = Summe `TimeEntry.hours` mit dessen `employmentId`. Mitarbeitendenliste: Wochenstunden und Urlaubstage aus den heute gültigen Konditionen (bei zwei Arbeitsverhältnissen Summe der Stunden, Gesellschaften als Kurznamen). Übersicht: Auslastung über `personTargetHours`; Hinweis „fehlender Kostensatz“ = bestehendes Arbeitsverhältnis, dessen heute gültige Konditionen `costRate = 0` haben. Export: Projektzeiten und Arbeitszeiten bekommen die Spalte „Gesellschaft“; Austritt = spätestes `endDate`.

- [ ] **Step 1:** Seiten nacheinander umstellen; keine Seite liest mehr `user.weeklyHours`, `vacationDaysPerYear`, `hourlyCost`, `carryover*`, `entryDate`, `exitDate`.
- [ ] **Step 2:** Run `grep -rnE "weeklyHours|vacationDaysPerYear|hourlyCost|carryoverDays|entryDate|exitDate" src --include=*.tsx --include=*.ts | grep -v "src/lib/stats.ts"` → Expected: keine Treffer außer Konditions-/Arbeitsverhältnis-Feldern (`terms.weeklyHours` u. ä.).
- [ ] **Step 3:** Run `npm run typecheck && npm test && npm run build` → Expected: grün.
- [ ] **Step 4:** Im Browser mit der Person aus Task 10: Konditionswechsel ab dem 15. eines Monats → Monats-Soll auf der Personenseite entspricht der Rechnung von Hand; Urlaub Mo–Fr bei einem Mo–Do-Vertrag zieht dort 4 Tage ab; CSV enthält die Spalte „Gesellschaft“.
- [ ] **Step 5: Commit** – `feat: Auswertungen, Urlaub und Export je Arbeitsverhältnis`

---

### Task 13: Personalakte und „Mein Profil“

**Files:**
- Create: `src/app/actions/personal.ts`, `src/app/(app)/mitarbeitende/[id]/personal-section.tsx`, `src/app/(app)/mitarbeitende/[id]/audit-section.tsx`, `src/app/(app)/profil/page.tsx`, `src/components/reveal-field.tsx`
- Modify: `src/app/(app)/mitarbeitende/[id]/page.tsx`, `src/app/(app)/konto/page.tsx`, `src/app/(app)/mehr/page.tsx`, `src/app/actions/admin.ts` (`anonymizeUser`)

**Interfaces:**
- Consumes: `encryptField`, `decryptField`, `maskValue`, Prüfungen aus Task 7; `audit`, `diffChanges`, `AUDIT_ACTION_LABELS`, `FIELD_LABELS` (Task 8).
- Produces:
  ```ts
  export async function savePersonalRecord(_: FormState, form: FormData): Promise<FormState>;
  export async function revealPersonalField(_: { value?: string; error?: string }, form: FormData): Promise<{ value?: string; error?: string }>;
  // form: userId, field ∈ "taxId" | "socialSecurity" | "iban"
  ```
- Regeln: `savePersonalRecord` verlangt `personnel.edit`. Leere Eingabe in Steuer-ID/SV-Nummer/IBAN lässt den gespeicherten Wert unverändert; Checkbox „entfernen“ löscht ihn. Ungültige Werte → „Bitte eine gültige IBAN angeben.“ / „Bitte eine gültige Steuer-ID (11 Ziffern) angeben.“ / „Bitte eine gültige Sozialversicherungsnummer angeben.“ Fehlt der Schlüssel, erscheint „Lohndaten können gerade nicht gespeichert werden (Schlüssel fehlt). Bitte den Admin informieren.“ und nichts wird gespeichert. `revealPersonalField`: erlaubt für die Person selbst oder mit `personnel.view`; bei fremden Daten `audit` mit `personal.read` (Feldname, ohne Wert). Lohndaten werden standardmäßig maskiert angezeigt, „Anzeigen“ holt den Klartext über `revealPersonalField`.
- Oberfläche: Personenseite – Abschnitt „Personalakte“ (nur mit `personnel.view`, bearbeiten mit `personnel.edit`) und „Protokoll“ (nur mit `audit.view`: die letzten 50 Einträge mit dieser Person als `subjectUserId`, mit Wer/Wann/Was und Feldnamen; Werte nur bei nicht sensiblen Feldern). „Mein Profil“ (`/profil`, für alle; verlinkt aus „Konto“ und „Mehr“): eigene Personalakte (nur lesen), eigene Arbeitsverhältnisse mit Gesellschaft, Zeitraum, Wochenstunden, Urlaubstagen und Gehalt (ohne Kostensatz), und „Wer hat meine Daten geändert“ (eigene Protokolleinträge, Lesezugriffe eingeschlossen). `anonymizeUser` löscht zusätzlich den `PersonalRecord`.

- [ ] **Step 1:** Actions bauen; manuell prüfen, dass `ibanEnc` in der DB mit `v1:` beginnt (`npx prisma studio` oder SQL).
- [ ] **Step 2:** Abschnitte und Profilseite bauen.
- [ ] **Step 3:** Run `npm run typecheck && npm test && npm run build` → Expected: grün.
- [ ] **Step 4:** Im Browser: Personalakte pflegen, IBAN ändern → Protokoll zeigt „Bankverbindung geändert“ ohne Wert; „Anzeigen“ als GF erzeugt einen Lesezugriff, der im Profil der betroffenen Person sichtbar ist; App ohne `PII_ENCRYPTION_KEY` starten und speichern → Meldung, nichts gespeichert.
- [ ] **Step 5: Commit** – `feat: Personalakte mit verschlüsselten Lohndaten und Mein Profil`

---

### Task 14: Personen ohne Login und Zugang ohne Arbeitsverhältnis

**Files:**
- Create: `src/lib/login.ts`, `src/lib/login.test.ts`
- Modify: `prisma/schema.prisma` (`User.email String? @unique`, `User.passwordHash String?`), `src/app/actions/auth.ts`, `src/app/actions/admin.ts` (`saveUser`), `src/app/actions/invite.ts`, `src/components/user-form.tsx`, `src/components/invite-panel.tsx`, `src/app/(app)/mitarbeitende/page.tsx`, `src/app/(app)/mitarbeitende/[id]/page.tsx`, `scripts/ensure-admin.mjs`

**Interfaces:**
- Consumes: `hasAccessOn` (Task 5).
- Produces:
  ```ts
  export function loginBlockReason(user: { passwordHash: string | null; active: boolean; accessWithoutEmployment: boolean },
    emps: readonly { id: string; startDate: string; endDate: string | null }[], today: string): string | null;
  ```
  Reihenfolge der Prüfung und Texte: kein `passwordHash` → „Für diese Person ist kein Zugang eingerichtet.“; `!active` oder `!hasAccessOn` → „Dieser Zugang ist nicht mehr aktiv.“; sonst `null`. Die Login-Action zeigt nach außen weiterhin nur die bisherige allgemeine Fehlermeldung, wenn die E-Mail unbekannt oder das Passwort falsch ist; `loginBlockReason` greift erst nach korrektem Passwort.
- Regeln: E-Mail optional im Personenformular; Einladung/Passwort-Link nur mit E-Mail („Für eine Einladung bitte zuerst eine E-Mail-Adresse eintragen.“). Neue Personen ohne Passwort bekommen `passwordHash = null` (kein Zufallspasswort mehr). Checkbox „Zugang ohne Arbeitsverhältnis“ (für GF ohne Vertrag oder externen Admin). Liste kennzeichnet „kein Zugang“ und „ohne Arbeitsverhältnis“. `ensure-admin.mjs` legt Startkonten mit `accessWithoutEmployment: true` an.

- [ ] **Step 1: Write the failing tests**

```ts
const emp = [{ id: "a", startDate: "2026-01-01", endDate: null }];
it("ohne Passwort kein Login", () => {
  expect(loginBlockReason({ passwordHash: null, active: true, accessWithoutEmployment: false }, emp, "2026-10-30"))
    .toBe("Für diese Person ist kein Zugang eingerichtet.");
});
it("beendet oder inaktiv", () => {
  expect(loginBlockReason({ passwordHash: "x", active: true, accessWithoutEmployment: false }, [], "2026-10-30"))
    .toBe("Dieser Zugang ist nicht mehr aktiv.");
  expect(loginBlockReason({ passwordHash: "x", active: false, accessWithoutEmployment: true }, [], "2026-10-30"))
    .toBe("Dieser Zugang ist nicht mehr aktiv.");
});
it("ohne Arbeitsverhältnis mit Kennzeichen erlaubt", () => {
  expect(loginBlockReason({ passwordHash: "x", active: true, accessWithoutEmployment: true }, [], "2026-10-30")).toBeNull();
});
```

- [ ] **Step 2:** Run `npm test` → Expected: FAIL.
- [ ] **Step 3:** `loginBlockReason` implementieren → Run `npm test` → Expected: PASS.
- [ ] **Step 4:** Schema (Migration `login_optional`), Actions und Oberfläche anpassen.
- [ ] **Step 5:** Run `npm run typecheck && npm run build` → Expected: grün. Im Browser: Person ohne E-Mail anlegen, Arbeitsverhältnis zuweisen, Liste/Export/Personenseite funktionieren; Einladungsknopf zeigt den Hinweis.
- [ ] **Step 6: Commit** – `feat: Personen ohne Login, Zugang ohne Arbeitsverhältnis`

---

### Task 15: Altfelder entfernen und Dokumentation

**Files:**
- Modify: `prisma/schema.prisma`, `src/lib/stats.ts`, `src/lib/exits.ts`, `README.md`, ggf. letzte Verweise
- Create: `prisma/migrations/<ts>_vertragsfelder_entfernen/`

**Interfaces:**
- Entfernt: `User.hourlyCost`, `weeklyHours`, `vacationDaysPerYear`, `carryoverDays`, `carryoverYear`, `entryDate`, `exitDate`; in `stats.ts` die nicht mehr genutzten `targetHours`, `vacationBalance`, `carryoverFor`, `trackingStart`, `employedOn`, `targetHoursFor`, `proRataVacation` (falls noch genutzt: auf die neuen Funktionen umstellen). `TimeEntry.employmentId` und `WorkDay.employmentId` werden Pflichtfelder.

- [ ] **Step 1:** Schema ändern, `npx prisma migrate dev --name vertragsfelder_entfernen`.
- [ ] **Step 2:** Run `npm run typecheck && npm test && npm run build` → Expected: grün.
- [ ] **Step 3:** README: Funktionen um Gesellschaften, Arbeitsverhältnisse, Konditionen, Personalakte, Mein Profil, Protokoll ergänzen; „Lokal starten“ auf `npm run dev` mit eingebautem PostgreSQL und `PII_ENCRYPTION_KEY` umschreiben; Rechenregeln (Soll/Urlaub je Arbeitsverhältnis, Kostensatz zum Buchungstag) aktualisieren.
- [ ] **Step 4:** Abschlussprüfung im Browser: kompletter Durchlauf – Gesellschaft → Person (ohne/mit Login) → zwei Arbeitsverhältnisse → Konditionswechsel → Buchungen auf beide → Urlaub → Personalakte → Protokoll → Mein Profil → Export.
- [ ] **Step 5: Commit** – `refactor: Vertragsfelder an Personen entfernt, README aktualisiert`
