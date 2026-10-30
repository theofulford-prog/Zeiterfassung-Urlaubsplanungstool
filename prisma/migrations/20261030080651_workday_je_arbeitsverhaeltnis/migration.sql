-- DropIndex
DROP INDEX "WorkDay_userId_date_key";

-- CreateIndex
CREATE INDEX "WorkDay_userId_date_idx" ON "WorkDay"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkDay_employmentId_date_key" ON "WorkDay"("employmentId", "date");

