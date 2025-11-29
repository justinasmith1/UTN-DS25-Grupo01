/*
  Warnings:

  - Made the column `numero` on table `Reserva` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Reserva" ALTER COLUMN "numero" SET NOT NULL;
