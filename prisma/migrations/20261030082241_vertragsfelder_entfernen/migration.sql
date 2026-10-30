-- AlterTable
ALTER TABLE "TimeEntry" ALTER COLUMN "employmentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "carryoverDays",
DROP COLUMN "carryoverYear",
DROP COLUMN "entryDate",
DROP COLUMN "exitDate",
DROP COLUMN "hourlyCost",
DROP COLUMN "vacationDaysPerYear",
DROP COLUMN "weeklyHours";

-- AlterTable
ALTER TABLE "WorkDay" ALTER COLUMN "employmentId" SET NOT NULL;

