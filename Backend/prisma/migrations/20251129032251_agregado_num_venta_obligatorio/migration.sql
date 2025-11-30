/*
  Warnings:

  - Made the column `numero` on table `Venta` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Venta" ALTER COLUMN "numero" SET NOT NULL;
