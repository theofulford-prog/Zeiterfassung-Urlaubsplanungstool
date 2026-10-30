-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WorkDay" ("breakMinutes", "date", "end", "id", "start", "updatedAt", "userId") SELECT "breakMinutes", "date", "end", "id", "start", "updatedAt", "userId" FROM "WorkDay";
DROP TABLE "WorkDay";
ALTER TABLE "new_WorkDay" RENAME TO "WorkDay";
CREATE UNIQUE INDEX "WorkDay_userId_date_key" ON "WorkDay"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
