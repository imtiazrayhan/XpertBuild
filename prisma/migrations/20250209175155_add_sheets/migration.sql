-- CreateTable
CREATE TABLE "SheetConnection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "range" TEXT NOT NULL,
    "lastSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SheetConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SheetConnection_projectId_idx" ON "SheetConnection"("projectId");

-- AddForeignKey
ALTER TABLE "SheetConnection" ADD CONSTRAINT "SheetConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
