// Rollen- und Rechtekonzept: feste Rollen, jede mit einer klar definierten Menge an Rechten.
// Alle Prüfungen in Seiten, Server-Actions und Exporten laufen über `can()`.

export const ROLES = ["ADMIN", "GF", "LEAD", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_INFO: Record<Role, { label: string; short: string; description: string }> = {
  ADMIN: {
    label: "Administrator:in",
    short: "Admin",
    description: "Voller Zugriff inkl. Rollenvergabe. Kann weitere Admins ernennen.",
  },
  GF: {
    label: "Geschäftsführung",
    short: "GF",
    description: "Sieht alle Auswertungen inkl. Kosten, verwaltet Mitarbeitende und Projekte, genehmigt Urlaub.",
  },
  LEAD: {
    label: "Team-/Projektleitung",
    short: "Leitung",
    description: "Genehmigt Urlaub, verwaltet Projekte und sieht Auslastung und Stunden – aber keine Kosten oder Kostensätze und keine Krankheitsgründe.",
  },
  EMPLOYEE: {
    label: "Mitarbeiter:in",
    short: "MA",
    description: "Erfasst eigene Zeiten und Abwesenheiten, sieht den Teamkalender (nur „abwesend“).",
  },
};

export const PERMISSIONS = {
  "reports.view": "Übersicht, Auslastung und Auswertungen je Person sehen",
  "costs.view": "Kostensätze und Personalkosten sehen",
  "absence.reasons": "Abwesenheitsgründe (z. B. Krankheit) und Notizen sehen",
  "leave.approve": "Urlaubsanträge genehmigen/ablehnen und Abwesenheiten für andere eintragen",
  "projects.manage": "Projekte anlegen, bearbeiten und abschließen",
  "users.manage": "Mitarbeitende anlegen, einladen und Stammdaten pflegen (inkl. Ein-/Austritt)",
  "users.delete": "Mitarbeitende anonymisieren oder endgültig löschen",
  "roles.manage": "Rollen vergeben inkl. Admin-Rolle",
  "export.data": "Daten des Teams als CSV exportieren",
  "time.editAll": "Abgeschlossene Monate und Buchungen anderer korrigieren",
} as const;
export type Permission = keyof typeof PERMISSIONS;

/** Standardrechte – gelten, solange unter "Rollen & Rechte" nichts geändert wurde. */
export const DEFAULT_MATRIX: Record<Role, Permission[]> = {
  ADMIN: Object.keys(PERMISSIONS) as Permission[],
  GF: ["reports.view", "costs.view", "absence.reasons", "leave.approve", "projects.manage", "users.manage", "users.delete", "export.data", "time.editAll"],
  LEAD: ["reports.view", "leave.approve", "projects.manage", "export.data"],
  EMPLOYEE: [],
};

/** Feste Regeln, die sich nicht abwählen lassen (Schutz vor Aussperren und Rechteausweitung). */
export const LOCKED = {
  /** Admins haben immer alle Rechte. */
  adminHasAll: true,
  /** Rollen vergeben bleibt Admins vorbehalten. */
  adminOnly: ["roles.manage"] as Permission[],
};

export const ROLE_RANK: Record<Role, number> = { ADMIN: 3, GF: 2, LEAD: 1, EMPLOYEE: 0 };

// Aktuelle (ggf. angepasste) Rechte. Liegt auf globalThis, damit alle Server-Module dieselbe Tabelle sehen;
// befüllt wird sie serverseitig aus der Datenbank (src/lib/rbac.ts) vor jeder Prüfung.
const store = globalThis as unknown as { __rbacMatrix?: Record<Role, Permission[]> };

export function effectiveMatrix(custom?: Partial<Record<Role, Permission[]>>): Record<Role, Permission[]> {
  const all = Object.keys(PERMISSIONS) as Permission[];
  const out = {} as Record<Role, Permission[]>;
  for (const r of ROLES) {
    if (r === "ADMIN") out[r] = all;
    else out[r] = (custom?.[r] ?? DEFAULT_MATRIX[r]).filter((p) => p in PERMISSIONS && !LOCKED.adminOnly.includes(p));
  }
  return out;
}

export function setActiveMatrix(m: Record<Role, Permission[]>) {
  store.__rbacMatrix = m;
}

function matrix(): Record<Role, Permission[]> {
  return store.__rbacMatrix ?? effectiveMatrix();
}

export function normalizeRole(role: string): Role {
  return (ROLES as readonly string[]).includes(role) ? (role as Role) : "EMPLOYEE";
}

export function can(role: string, permission: Permission): boolean {
  return matrix()[normalizeRole(role)].includes(permission);
}

export function permissionsOf(role: string): Permission[] {
  return matrix()[normalizeRole(role)];
}

/** Welche Rollen darf jemand vergeben? Admin-Rolle nur durch Admins, sonst höchstens die eigene Stufe. */
export function assignableRoles(actorRole: string): Role[] {
  if (can(actorRole, "roles.manage")) return [...ROLES];
  if (!can(actorRole, "users.manage")) return [];
  const rank = ROLE_RANK[normalizeRole(actorRole)];
  return ROLES.filter((r) => r !== "ADMIN" && ROLE_RANK[r] <= rank);
}

/** Darf die handelnde Person das Konto (Stammdaten, Passwort-Links) einer Person mit dieser Rolle verwalten? */
export function canManageUser(actorRole: string, targetRole: string): boolean {
  if (can(actorRole, "roles.manage")) return true;
  if (!can(actorRole, "users.manage")) return false;
  const target = normalizeRole(targetRole);
  return target !== "ADMIN" && ROLE_RANK[target] <= ROLE_RANK[normalizeRole(actorRole)];
}

/** Zugangsschutz für Seiten (geprüft auf jeder Seite gegen die aktuellen Rechte). */
export const PAGE_PERMISSIONS: [prefix: string, permission: Permission][] = [
  ["/uebersicht", "reports.view"],
  ["/projekte", "projects.manage"],
  ["/mitarbeitende", "reports.view"],
  ["/antraege", "leave.approve"],
  ["/rollen", "reports.view"],
];

/** Startseite nach dem Login. */
export function homeFor(role: string): string {
  return can(role, "reports.view") ? "/uebersicht" : "/zeiten";
}
