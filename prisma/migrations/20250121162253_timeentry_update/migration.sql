/*
  Warnings:

  - You are about to drop the column `hours` on the `TimeEntry` table. All the data in the column will be lost.
  - Added the required column `weekNumber` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearNumber` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "TimeEntry" DROP COLUMN "hours",
ADD COLUMN     "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "regularHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "weekNumber" INTEGER NOT NULL,
ADD COLUMN     "yearNumber" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "yearNumber" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_employeeId_weekNumber_yearNumber_idx" ON "Payment"("employeeId", "weekNumber", "yearNumber");

-- CreateIndex
CREATE INDEX "TimeEntry_employeeId_date_idx" ON "TimeEntry"("employeeId", "date");

-- CreateIndex
CREATE INDEX "TimeEntry_projectId_date_idx" ON "TimeEntry"("projectId", "date");

-- CreateIndex
CREATE INDEX "TimeEntry_weekNumber_yearNumber_idx" ON "TimeEntry"("weekNumber", "yearNumber");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
