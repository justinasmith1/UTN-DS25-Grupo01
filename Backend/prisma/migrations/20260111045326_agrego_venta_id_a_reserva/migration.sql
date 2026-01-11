/*
  Warnings:

  - You are about to drop the column `reservaId` on the `Venta` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ventaId]` on the table `Reserva` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Venta" DROP CONSTRAINT "Venta_reservaId_fkey";

-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "ventaId" INTEGER;

-- AlterTable
ALTER TABLE "Venta" DROP COLUMN "reservaId";

-- CreateIndex
CREATE UNIQUE INDEX "Reserva_ventaId_key" ON "Reserva"("ventaId");

-- AddForeignKey
ALTER TABLE "Reserva" ADD CONSTRAINT "Reserva_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
