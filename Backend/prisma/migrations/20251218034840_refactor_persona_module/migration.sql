/*
  Warnings:

  - A unique constraint covering the columns `[identificadorTipo,identificadorValor]` on the table `Persona` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `identificadorTipo` to the `Persona` table without a default value. This is not possible if the table is not empty.
  - Added the required column `identificadorValor` to the `Persona` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."IdentificadorTipo" AS ENUM ('DNI', 'CUIL', 'CUIT', 'PASAPORTE', 'OTRO');

-- CreateEnum
CREATE TYPE "public"."EstadoPersona" AS ENUM ('ACTIVA', 'INACTIVA');

-- AlterTable
ALTER TABLE "public"."Persona" ADD COLUMN     "estado" "public"."EstadoPersona" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "identificadorTipo" "public"."IdentificadorTipo" NOT NULL,
ADD COLUMN     "identificadorValor" TEXT NOT NULL,
ADD COLUMN     "inmobiliariaId" INTEGER,
ADD COLUMN     "razonSocial" TEXT,
ALTER COLUMN "nombre" DROP NOT NULL,
ALTER COLUMN "apellido" DROP NOT NULL,
ALTER COLUMN "cuil" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Persona_estado_idx" ON "public"."Persona"("estado");

-- CreateIndex
CREATE INDEX "Persona_inmobiliariaId_idx" ON "public"."Persona"("inmobiliariaId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_identificadorTipo_identificadorValor_key" ON "public"."Persona"("identificadorTipo", "identificadorValor");

-- AddForeignKey
ALTER TABLE "public"."Persona" ADD CONSTRAINT "Persona_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "public"."Inmobiliaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
