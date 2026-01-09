-- CreateTable
CREATE TABLE "Promocion" (
    "id" SERIAL NOT NULL,
    "loteId" INTEGER NOT NULL,
    "precioAnterior" DECIMAL(12,2) NOT NULL,
    "precioPromocional" DECIMAL(12,2) NOT NULL,
    "estadoAnterior" "EstadoLote" NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fin" TIMESTAMP(3),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "explicacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promocion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promocion_loteId_idx" ON "Promocion"("loteId");

-- CreateIndex
CREATE INDEX "Promocion_activa_idx" ON "Promocion"("activa");

-- CreateIndex
CREATE INDEX "Promocion_fin_idx" ON "Promocion"("fin");

-- AddForeignKey
ALTER TABLE "Promocion" ADD CONSTRAINT "Promocion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
