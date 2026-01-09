-- CreateEnum
CREATE TYPE "PersonaCategoria" AS ENUM ('OPERATIVA', 'MIEMBRO_FAMILIAR');

-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "categoria" "PersonaCategoria" NOT NULL DEFAULT 'OPERATIVA';

-- CreateIndex
CREATE INDEX "Persona_categoria_idx" ON "Persona"("categoria");
