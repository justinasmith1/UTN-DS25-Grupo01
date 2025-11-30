/*
  Warnings:

  - A unique constraint covering the columns `[numero]` on the table `Venta` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Venta" ADD COLUMN     "numero" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Venta_numero_key" ON "public"."Venta"("numero");
