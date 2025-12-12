/*
  Warnings:

  - You are about to drop the column `inmobiliariaId` on the `Persona` table. All the data in the column will be lost.
  - Made the column `cuil` on table `Persona` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Persona" DROP CONSTRAINT "Persona_inmobiliariaId_fkey";

-- AlterTable
ALTER TABLE "public"."Persona" DROP COLUMN "inmobiliariaId",
ALTER COLUMN "cuil" SET NOT NULL;
