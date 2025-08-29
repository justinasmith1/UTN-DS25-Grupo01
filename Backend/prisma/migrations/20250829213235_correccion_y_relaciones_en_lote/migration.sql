-- DropForeignKey
ALTER TABLE "public"."Ubicacion" DROP CONSTRAINT "Ubicacion_loteId_fkey";

-- AlterTable
ALTER TABLE "public"."Ubicacion" ALTER COLUMN "loteId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Ubicacion" ADD CONSTRAINT "Ubicacion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
