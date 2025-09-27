-- AlterTable
ALTER TABLE "public"."Archivos" ADD COLUMN     "uploadedBy" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Archivos" ADD CONSTRAINT "Archivos_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."User"("username") ON DELETE SET NULL ON UPDATE CASCADE;
