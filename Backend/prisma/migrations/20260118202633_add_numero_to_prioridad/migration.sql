/*
  Warnings:

  - A unique constraint covering the columns `[numero]` on the table `Prioridad` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Prioridad" ADD COLUMN     "numero" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Prioridad_numero_key" ON "Prioridad"("numero");
