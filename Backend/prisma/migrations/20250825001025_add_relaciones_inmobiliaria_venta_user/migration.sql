/*
  Warnings:

  - A unique constraint covering the columns `[ventaId]` on the table `Inmobiliaria` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Inmobiliaria` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ventaId` to the `Inmobiliaria` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Inmobiliaria" ADD COLUMN     "userId" INTEGER,
ADD COLUMN     "ventaId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Inmobiliaria_ventaId_key" ON "public"."Inmobiliaria"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "Inmobiliaria_userId_key" ON "public"."Inmobiliaria"("userId");

-- AddForeignKey
ALTER TABLE "public"."Inmobiliaria" ADD CONSTRAINT "Inmobiliaria_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "public"."Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Inmobiliaria" ADD CONSTRAINT "Inmobiliaria_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
