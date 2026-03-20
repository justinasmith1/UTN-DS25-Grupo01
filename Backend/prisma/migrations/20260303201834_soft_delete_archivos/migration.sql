/*
  Warnings:

  - Added the required column `updatedAt` to the `Archivos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Archivos" ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "estadoOperativo" "EstadoOperativo" NOT NULL DEFAULT 'OPERATIVO',
ADD COLUMN     "fechaBaja" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Archivos_estadoOperativo_idx" ON "Archivos"("estadoOperativo");
