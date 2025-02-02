/*
  Warnings:

  - You are about to drop the `UnionClassRate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UnionClassRate" DROP CONSTRAINT "UnionClassRate_unionClassId_fkey";

-- DropTable
DROP TABLE "UnionClassRate";

-- CreateTable
CREATE TABLE "UnionClassBaseRate" (
    "id" SERIAL NOT NULL,
    "unionClassId" INTEGER NOT NULL,
    "regularRate" DOUBLE PRECISION NOT NULL,
    "overtimeRate" DOUBLE PRECISION NOT NULL,
    "benefitsRate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnionClassBaseRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnionClassCustomRate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rate" DOUBLE PRECISION NOT NULL,
    "unionClassId" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnionClassCustomRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnionClassBaseRate_unionClassId_effectiveDate_idx" ON "UnionClassBaseRate"("unionClassId", "effectiveDate");

-- CreateIndex
CREATE INDEX "UnionClassCustomRate_unionClassId_effectiveDate_idx" ON "UnionClassCustomRate"("unionClassId", "effectiveDate");

-- AddForeignKey
ALTER TABLE "UnionClassBaseRate" ADD CONSTRAINT "UnionClassBaseRate_unionClassId_fkey" FOREIGN KEY ("unionClassId") REFERENCES "UnionClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnionClassCustomRate" ADD CONSTRAINT "UnionClassCustomRate_unionClassId_fkey" FOREIGN KEY ("unionClassId") REFERENCES "UnionClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
