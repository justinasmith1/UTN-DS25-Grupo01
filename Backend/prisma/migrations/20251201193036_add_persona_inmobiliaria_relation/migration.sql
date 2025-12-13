-- AlterTable
ALTER TABLE "public"."Persona" ADD COLUMN     "inmobiliariaId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."Persona" ADD CONSTRAINT "Persona_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "public"."Inmobiliaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
