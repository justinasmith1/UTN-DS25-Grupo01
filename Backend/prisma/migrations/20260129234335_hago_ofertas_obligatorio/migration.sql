/*
  Warnings:

  - Made the column `ofertaActual` on table `Reserva` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ofertaInicial` on table `Reserva` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Reserva" ALTER COLUMN "ofertaActual" SET NOT NULL,
ALTER COLUMN "ofertaInicial" SET NOT NULL;
