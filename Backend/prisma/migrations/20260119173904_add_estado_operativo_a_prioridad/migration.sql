-- CreateEnum
CREATE TYPE "EstadoOperativo" AS ENUM ('OPERATIVO', 'ELIMINADO');

-- AlterTable
ALTER TABLE "Prioridad" ADD COLUMN     "estadoOperativo" "EstadoOperativo" NOT NULL DEFAULT 'OPERATIVO';

-- CreateIndex
CREATE INDEX "idx_prioridad_estado_operativo" ON "Prioridad"("estadoOperativo");
