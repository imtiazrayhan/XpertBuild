/*
  Warnings:

  - A unique constraint covering the columns `[employeeId,date,projectId,source]` on the table `TimeEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "sourceHash" TEXT,
ADD COLUMN     "sourceRow" INTEGER;

-- CreateIndex
CREATE INDEX "TimeEntry_sourceHash_idx" ON "TimeEntry"("sourceHash");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_employeeId_date_projectId_source_key" ON "TimeEntry"("employeeId", "date", "projectId", "source");
