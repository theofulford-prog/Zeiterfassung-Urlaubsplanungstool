-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "employmentId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessWithoutEmployment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WorkDay" ADD COLUMN     "employmentId" TEXT;

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractType" TEXT NOT NULL,
    "jobTitle" TEXT,
    "personnelNumber" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "probationEndDate" TEXT,
    "fixedTermEndDate" TEXT,
    "carryoverDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carryoverYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentTerms" (
    "id" TEXT NOT NULL,
    "employmentId" TEXT NOT NULL,
    "validFrom" TEXT NOT NULL,
    "weeklyHours" DOUBLE PRECISION,
    "workDays" INTEGER[],
    "vacationDaysPerYear" DOUBLE PRECISION NOT NULL,
    "payType" TEXT NOT NULL,
    "payAmount" DOUBLE PRECISION,
    "costRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "EmploymentTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalRecord" (
    "userId" TEXT NOT NULL,
    "birthDate" TEXT,
    "street" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "privateEmail" TEXT,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelation" TEXT,
    "healthInsurance" TEXT,
    "taxIdEnc" TEXT,
    "socialSecurityEnc" TEXT,
    "ibanEnc" TEXT,
    "accountHolder" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalRecord_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "changes" JSONB,
    "reason" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Employment_userId_idx" ON "Employment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Employment_companyId_personnelNumber_key" ON "Employment"("companyId", "personnelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentTerms_employmentId_validFrom_key" ON "EmploymentTerms"("employmentId", "validFrom");

-- CreateIndex
CREATE INDEX "AuditLog_subjectUserId_at_idx" ON "AuditLog"("subjectUserId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkDay" ADD CONSTRAINT "WorkDay_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentTerms" ADD CONSTRAINT "EmploymentTerms_employmentId_fkey" FOREIGN KEY ("employmentId") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalRecord" ADD CONSTRAINT "PersonalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
