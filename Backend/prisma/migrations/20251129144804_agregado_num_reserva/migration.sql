/*
  Warnings:

  - A unique constraint covering the columns `[numero]` on the table `Reserva` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Reserva" ADD COLUMN     "numero" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_numero_key" ON "public"."Reserva"("numero");
