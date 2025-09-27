-- DropForeignKey
ALTER TABLE "public"."Archivos" DROP CONSTRAINT "Archivos_uploadedBy_fkey";

-- AddForeignKey
ALTER TABLE "public"."Archivos" ADD CONSTRAINT "Archivos_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."User"("email") ON DELETE SET NULL ON UPDATE CASCADE;
