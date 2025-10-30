-- AlterTable
ALTER TABLE "public"."Lote" ADD COLUMN     "inquilinoId" INTEGER;

-- AlterTable
ALTER TABLE "public"."Persona" ADD COLUMN     "jefeDeFamiliaId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Persona" ADD CONSTRAINT "Persona_jefeDeFamiliaId_fkey" FOREIGN KEY ("jefeDeFamiliaId") REFERENCES "public"."Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lote" ADD CONSTRAINT "Lote_inquilinoId_fkey" FOREIGN KEY ("inquilinoId") REFERENCES "public"."Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
