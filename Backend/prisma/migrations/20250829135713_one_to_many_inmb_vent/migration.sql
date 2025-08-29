/*
  Warnings:

  - You are about to drop the column `vendedorId` on the `Venta` table. All the data in the column will be lost.
  - You are about to drop the `_InmobiliariaToVenta` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Venta" DROP CONSTRAINT "Venta_compradorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Venta" DROP CONSTRAINT "Venta_loteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."_InmobiliariaToVenta" DROP CONSTRAINT "_InmobiliariaToVenta_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_InmobiliariaToVenta" DROP CONSTRAINT "_InmobiliariaToVenta_B_fkey";

-- AlterTable
ALTER TABLE "public"."Venta" DROP COLUMN "vendedorId",
ADD COLUMN     "inmobiliariaId" INTEGER;

-- DropTable
DROP TABLE "public"."_InmobiliariaToVenta";

-- AddForeignKey
ALTER TABLE "public"."Venta" ADD CONSTRAINT "Venta_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venta" ADD CONSTRAINT "Venta_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "public"."Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venta" ADD CONSTRAINT "Venta_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "public"."Inmobiliaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
