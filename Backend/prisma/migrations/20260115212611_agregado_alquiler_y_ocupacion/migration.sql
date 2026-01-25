-- CreateEnum
CREATE TYPE "EstadoAlquiler" AS ENUM ('ACTIVO', 'FINALIZADO');

-- CreateTable
CREATE TABLE "Alquiler" (
    "id" SERIAL NOT NULL,
    "loteId" INTEGER NOT NULL,
    "inquilinoId" INTEGER NOT NULL,
    "estado" "EstadoAlquiler" NOT NULL DEFAULT 'ACTIVO',
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alquiler_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_alquiler_lote" ON "Alquiler"("loteId");

-- CreateIndex
CREATE INDEX "idx_alquiler_inquilino" ON "Alquiler"("inquilinoId");

-- CreateIndex
CREATE INDEX "idx_alquiler_estado" ON "Alquiler"("estado");

-- AddForeignKey
ALTER TABLE "Alquiler" ADD CONSTRAINT "Alquiler_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alquiler" ADD CONSTRAINT "Alquiler_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
