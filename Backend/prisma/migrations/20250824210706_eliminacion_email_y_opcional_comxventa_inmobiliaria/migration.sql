/*
  Warnings:

  - You are about to drop the column `email` on the `Inmobiliaria` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Inmobiliaria" DROP COLUMN "email",
ALTER COLUMN "comxventa" DROP NOT NULL;
