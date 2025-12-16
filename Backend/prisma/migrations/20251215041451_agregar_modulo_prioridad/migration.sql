-- CreateEnum
CREATE TYPE "public"."EstadoPrioridad" AS ENUM ('ACTIVA', 'CANCELADA', 'FINALIZADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "public"."OwnerPrioridad" AS ENUM ('INMOBILIARIA', 'CCLF');

-- AlterEnum
ALTER TYPE "public"."EstadoLote" ADD VALUE 'CON_PRIORIDAD';

-- CreateTable
CREATE TABLE "public"."Prioridad" (
    "id" SERIAL NOT NULL,
    "loteId" INTEGER NOT NULL,
    "estado" "public"."EstadoPrioridad" NOT NULL DEFAULT 'ACTIVA',
    "ownerType" "public"."OwnerPrioridad" NOT NULL,
    "inmobiliariaId" INTEGER,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "loteEstadoAlCrear" "public"."EstadoLote" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prioridad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_prioridad_lote" ON "public"."Prioridad"("loteId");

-- CreateIndex
CREATE INDEX "idx_prioridad_estado" ON "public"."Prioridad"("estado");

-- CreateIndex
CREATE INDEX "idx_prioridad_fecha_fin" ON "public"."Prioridad"("fechaFin");

-- AddForeignKey
ALTER TABLE "public"."Prioridad" ADD CONSTRAINT "Prioridad_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prioridad" ADD CONSTRAINT "Prioridad_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "public"."Inmobiliaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
