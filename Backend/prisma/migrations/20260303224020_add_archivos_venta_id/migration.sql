-- AlterTable
ALTER TABLE "Archivos" ADD COLUMN     "ventaId" INTEGER;

-- AddForeignKey
ALTER TABLE "Archivos" ADD CONSTRAINT "Archivos_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
