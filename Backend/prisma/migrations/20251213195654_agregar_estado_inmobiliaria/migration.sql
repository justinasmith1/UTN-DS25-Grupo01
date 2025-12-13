-- CreateEnum
CREATE TYPE "public"."EstadoInmobiliaria" AS ENUM ('ACTIVA', 'INACTIVA');

-- AlterTable
ALTER TABLE "public"."Inmobiliaria" ADD COLUMN     "estado" "public"."EstadoInmobiliaria" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "fechaBaja" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Inmobiliaria_estado_idx" ON "public"."Inmobiliaria"("estado");
