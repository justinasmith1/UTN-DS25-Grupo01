/*
  Warnings:

  - You are about to drop the column `fechaFinContraoferta` on the `Reserva` table. All the data in the column will be lost.
  - You are about to drop the column `montoContraoferta` on the `Reserva` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Reserva" DROP COLUMN "fechaFinContraoferta",
DROP COLUMN "montoContraoferta";
