-- DropForeignKey
ALTER TABLE "public"."Inmobiliaria" DROP CONSTRAINT "Inmobiliaria_ventaId_fkey";

-- DropIndex
DROP INDEX "public"."Inmobiliaria_ventaId_key";

-- AlterTable
ALTER TABLE "public"."Inmobiliaria" ALTER COLUMN "ventaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Inmobiliaria" ADD CONSTRAINT "Inmobiliaria_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "public"."Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
