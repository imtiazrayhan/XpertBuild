/*
  Warnings:

  - The primary key for the `SyncLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `errorCount` on the `SyncLog` table. All the data in the column will be lost.
  - You are about to drop the column `successCount` on the `SyncLog` table. All the data in the column will be lost.
  - You are about to drop the column `syncDate` on the `SyncLog` table. All the data in the column will be lost.
  - You are about to drop the column `totalEntries` on the `SyncLog` table. All the data in the column will be lost.
  - The `id` column on the `SyncLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `source` column on the `TimeEntry` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `startTime` to the `SyncLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `SyncLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `SyncLog` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TimeEntrySource" AS ENUM ('APP', 'SHEET');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('IN_PROGRESS', 'SUCCESS', 'ERROR');

-- AlterTable
ALTER TABLE "SyncLog" DROP CONSTRAINT "SyncLog_pkey",
DROP COLUMN "errorCount",
DROP COLUMN "successCount",
DROP COLUMN "syncDate",
DROP COLUMN "totalEntries",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "rowsError" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rowsRead" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rowsSuccess" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "SyncStatus" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TimeEntry" DROP COLUMN "source",
ADD COLUMN     "source" "TimeEntrySource" NOT NULL DEFAULT 'APP';
