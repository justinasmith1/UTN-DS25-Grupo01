-- CreateEnum
CREATE TYPE "public"."EstadoCobro" AS ENUM ('PENDIENTE', 'EN_CURSO', 'COMPLETADA');

-- AlterEnum
ALTER TYPE "public"."EstadoVenta" ADD VALUE 'CANCELADA';

-- AlterTable
ALTER TABLE "public"."Venta" ADD COLUMN     "estadoCobro" "public"."EstadoCobro" NOT NULL DEFAULT 'PENDIENTE';
