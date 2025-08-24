-- CreateTable
CREATE TABLE "public"."Reserva" (
    "id" SERIAL NOT NULL,
    "fechaReserva" TIMESTAMP(3) NOT NULL,
    "loteId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "inmobiliariaId" INTEGER,
    "sena" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_reserva_lote" ON "public"."Reserva"("loteId");

-- CreateIndex
CREATE INDEX "idx_reserva_cliente" ON "public"."Reserva"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_clienteId_loteId_fechaReserva_key" ON "public"."Reserva"("clienteId", "loteId", "fechaReserva");
