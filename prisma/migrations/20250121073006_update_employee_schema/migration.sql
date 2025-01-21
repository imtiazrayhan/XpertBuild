/*
  Warnings:

  - The primary key for the `Employee` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `classification` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Employee` table. All the data in the column will be lost.
  - The `id` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unionClassId` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `TimeEntry` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `TimeEntry` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `UnionClass` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `UnionClass` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `UnionClassRate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `UnionClassRate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[ssn]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeType` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `employeeId` on the `TimeEntry` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unionClassId` on the `UnionClassRate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('LOCAL', 'UNION');

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_unionClassId_fkey";

-- DropForeignKey
ALTER TABLE "TimeEntry" DROP CONSTRAINT "TimeEntry_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "UnionClassRate" DROP CONSTRAINT "UnionClassRate_unionClassId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_pkey",
DROP COLUMN "classification",
DROP COLUMN "name",
DROP COLUMN "status",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "employeeType" "EmployeeType" NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "isFieldWorker" BOOLEAN,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "zip" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "unionClassId",
ADD COLUMN     "unionClassId" INTEGER,
ADD CONSTRAINT "Employee_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TimeEntry" DROP CONSTRAINT "TimeEntry_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL,
ADD CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "UnionClass" DROP CONSTRAINT "UnionClass_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "UnionClass_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "UnionClassRate" DROP CONSTRAINT "UnionClassRate_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "unionClassId",
ADD COLUMN     "unionClassId" INTEGER NOT NULL,
ADD CONSTRAINT "UnionClassRate_pkey" PRIMARY KEY ("id");

-- DropEnum
DROP TYPE "EmployeeClass";

-- DropEnum
DROP TYPE "EmployeeStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Employee_ssn_key" ON "Employee"("ssn");

-- CreateIndex
CREATE INDEX "Employee_employeeType_idx" ON "Employee"("employeeType");

-- CreateIndex
CREATE INDEX "Employee_ssn_idx" ON "Employee"("ssn");

-- CreateIndex
CREATE INDEX "UnionClassRate_unionClassId_effectiveDate_idx" ON "UnionClassRate"("unionClassId", "effectiveDate");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_unionClassId_fkey" FOREIGN KEY ("unionClassId") REFERENCES "UnionClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnionClassRate" ADD CONSTRAINT "UnionClassRate_unionClassId_fkey" FOREIGN KEY ("unionClassId") REFERENCES "UnionClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
