/*
  Warnings:

  - You are about to drop the column `ventaId` on the `Inmobiliaria` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Inmobiliaria" DROP CONSTRAINT "Inmobiliaria_ventaId_fkey";

-- AlterTable
ALTER TABLE "public"."Inmobiliaria" DROP COLUMN "ventaId";

-- CreateTable
CREATE TABLE "public"."_InmobiliariaToVenta" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_InmobiliariaToVenta_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_InmobiliariaToVenta_B_index" ON "public"."_InmobiliariaToVenta"("B");

-- AddForeignKey
ALTER TABLE "public"."_InmobiliariaToVenta" ADD CONSTRAINT "_InmobiliariaToVenta_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Inmobiliaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_InmobiliariaToVenta" ADD CONSTRAINT "_InmobiliariaToVenta_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
