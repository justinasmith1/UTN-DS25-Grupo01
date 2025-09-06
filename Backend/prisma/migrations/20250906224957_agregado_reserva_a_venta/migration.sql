-- AlterTable
ALTER TABLE "public"."Venta" ADD COLUMN     "reservaId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Venta" ADD CONSTRAINT "Venta_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "public"."Reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;
