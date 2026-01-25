/*
  Warnings:

  - Made the column `numero` on table `Prioridad` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Prioridad" ALTER COLUMN "numero" SET NOT NULL;
