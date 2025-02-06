-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'APP';

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "syncDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalEntries" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "errors" JSONB,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);
