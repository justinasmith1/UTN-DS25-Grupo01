-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "ofertaActual" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "OfertaReserva" (
    "id" SERIAL NOT NULL,
    "reservaId" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT,
    "plazoHasta" TIMESTAMP(3),
    "nombreEfector" TEXT NOT NULL,
    "efectorId" INTEGER,
    "ownerType" "OwnerPrioridad" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfertaReserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfertaReserva_reservaId_idx" ON "OfertaReserva"("reservaId");

-- AddForeignKey
ALTER TABLE "OfertaReserva" ADD CONSTRAINT "OfertaReserva_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
