/*
  Warnings:

  - The values [COMPLETADA,OPERATIVO,ELIMINADO] on the enum `EstadoCobro` will be removed. If these variants are still used in the database, this will fail.
  - The values [ESCRITURA_PROGRAMADA] on the enum `EstadoVenta` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EstadoCobro_new" AS ENUM ('PENDIENTE', 'EN_CURSO', 'PAGO_COMPLETO');
ALTER TABLE "public"."Venta" ALTER COLUMN "estadoCobro" DROP DEFAULT;
ALTER TABLE "Venta" ALTER COLUMN "estadoCobro" TYPE "EstadoCobro_new" USING ("estadoCobro"::text::"EstadoCobro_new");
ALTER TYPE "EstadoCobro" RENAME TO "EstadoCobro_old";
ALTER TYPE "EstadoCobro_new" RENAME TO "EstadoCobro";
DROP TYPE "public"."EstadoCobro_old";
ALTER TABLE "Venta" ALTER COLUMN "estadoCobro" SET DEFAULT 'PENDIENTE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoVenta_new" AS ENUM ('INICIADA', 'CON_BOLETO', 'ESCRITURADO', 'CANCELADA');
ALTER TABLE "public"."Venta" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Venta" ALTER COLUMN "estado" TYPE "EstadoVenta_new" USING ("estado"::text::"EstadoVenta_new");
ALTER TABLE "Venta" ALTER COLUMN "estadoPrevio" TYPE "EstadoVenta_new" USING ("estadoPrevio"::text::"EstadoVenta_new");
ALTER TYPE "EstadoVenta" RENAME TO "EstadoVenta_old";
ALTER TYPE "EstadoVenta_new" RENAME TO "EstadoVenta";
DROP TYPE "public"."EstadoVenta_old";
ALTER TABLE "Venta" ALTER COLUMN "estado" SET DEFAULT 'INICIADA';
COMMIT;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "fechaCancelacion" TIMESTAMP(3),
ADD COLUMN     "fechaEscrituraReal" TIMESTAMP(3),
ADD COLUMN     "motivoCancelacion" TEXT;
