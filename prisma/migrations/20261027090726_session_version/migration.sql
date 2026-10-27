-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "hourlyCost" REAL NOT NULL DEFAULT 0,
    "weeklyHours" REAL NOT NULL DEFAULT 40,
    "vacationDaysPerYear" INTEGER NOT NULL DEFAULT 30,
    "carryoverDays" REAL NOT NULL DEFAULT 0,
    "carryoverYear" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("active", "carryoverDays", "carryoverYear", "createdAt", "email", "hourlyCost", "id", "name", "passwordHash", "role", "vacationDaysPerYear", "weeklyHours") SELECT "active", "carryoverDays", "carryoverYear", "createdAt", "email", "hourlyCost", "id", "name", "passwordHash", "role", "vacationDaysPerYear", "weeklyHours" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
