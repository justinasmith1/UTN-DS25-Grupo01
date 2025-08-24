-- CreateEnum
CREATE TYPE "public"."EstadoVenta" AS ENUM ('INICIADA', 'CON_BOLETO', 'ESCRITURA_PROGRAMADA', 'ESCRITURADO');

-- CreateTable
CREATE TABLE "public"."Venta" (
    "id" SERIAL NOT NULL,
    "loteId" INTEGER NOT NULL,
    "fechaVenta" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" "public"."EstadoVenta" NOT NULL DEFAULT 'INICIADA',
    "plazoEscritura" TIMESTAMP(3),
    "tipoPago" TEXT NOT NULL,
    "compradorId" INTEGER NOT NULL,
    "vendedorId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Venta" ADD CONSTRAINT "Venta_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venta" ADD CONSTRAINT "Venta_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "public"."Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
