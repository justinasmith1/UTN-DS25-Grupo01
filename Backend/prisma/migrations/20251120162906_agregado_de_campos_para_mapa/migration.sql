/*
  Warnings:

  - A unique constraint covering the columns `[mapId]` on the table `Lote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Lote" ADD COLUMN     "mapId" TEXT,
ADD COLUMN     "numero" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Lote_mapId_key" ON "public"."Lote"("mapId");
