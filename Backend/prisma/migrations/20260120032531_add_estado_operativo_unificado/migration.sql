/*
  Warnings:

  - The values [OPERATIVO,ELIMINADO] on the enum `EstadoPrioridad` will be removed. If these variants are still used in the database, this will fail.
  - The values [OPERATIVO,ELIMINADO] on the enum `EstadoReserva` will be removed. If these variants are still used in the database, this will fail.
  - The values [OPERATIVO,ELIMINADO] on the enum `EstadoVenta` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `estado` on the `Inmobiliaria` table. All the data in the column will be lost.
  - You are about to drop the column `estado` on the `Persona` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EstadoPrioridad_new" AS ENUM ('ACTIVA', 'CANCELADA', 'FINALIZADA', 'EXPIRADA');
ALTER TABLE "public"."Prioridad" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Prioridad" ALTER COLUMN "estado" TYPE "EstadoPrioridad_new" USING ("estado"::text::"EstadoPrioridad_new");
ALTER TYPE "EstadoPrioridad" RENAME TO "EstadoPrioridad_old";
ALTER TYPE "EstadoPrioridad_new" RENAME TO "EstadoPrioridad";
DROP TYPE "public"."EstadoPrioridad_old";
ALTER TABLE "Prioridad" ALTER COLUMN "estado" SET DEFAULT 'ACTIVA';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoReserva_new" AS ENUM ('ACTIVA', 'CANCELADA', 'ACEPTADA', 'RECHAZADA', 'CONTRAOFERTA', 'EXPIRADA');
ALTER TABLE "public"."Reserva" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Reserva" ALTER COLUMN "estado" TYPE "EstadoReserva_new" USING ("estado"::text::"EstadoReserva_new");
ALTER TABLE "Reserva" ALTER COLUMN "estadoPrevio" TYPE "EstadoReserva_new" USING ("estadoPrevio"::text::"EstadoReserva_new");
ALTER TYPE "EstadoReserva" RENAME TO "EstadoReserva_old";
ALTER TYPE "EstadoReserva_new" RENAME TO "EstadoReserva";
DROP TYPE "public"."EstadoReserva_old";
ALTER TABLE "Reserva" ALTER COLUMN "estado" SET DEFAULT 'ACTIVA';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoVenta_new" AS ENUM ('INICIADA', 'CON_BOLETO', 'ESCRITURA_PROGRAMADA', 'ESCRITURADO', 'CANCELADA');
ALTER TABLE "public"."Venta" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Venta" ALTER COLUMN "estado" TYPE "EstadoVenta_new" USING ("estado"::text::"EstadoVenta_new");
ALTER TABLE "Venta" ALTER COLUMN "estadoPrevio" TYPE "EstadoVenta_new" USING ("estadoPrevio"::text::"EstadoVenta_new");
ALTER TYPE "EstadoVenta" RENAME TO "EstadoVenta_old";
ALTER TYPE "EstadoVenta_new" RENAME TO "EstadoVenta";
DROP TYPE "public"."EstadoVenta_old";
ALTER TABLE "Venta" ALTER COLUMN "estado" SET DEFAULT 'INICIADA';
COMMIT;

-- DropIndex
DROP INDEX "public"."Inmobiliaria_estado_idx";

-- DropIndex
DROP INDEX "public"."Persona_estado_idx";

-- AlterTable
ALTER TABLE "Inmobiliaria" DROP COLUMN "estado",
ADD COLUMN     "estadoOperativo" "EstadoOperativo" NOT NULL DEFAULT 'OPERATIVO';

-- AlterTable
ALTER TABLE "Persona" DROP COLUMN "estado",
ADD COLUMN     "estadoOperativo" "EstadoOperativo" NOT NULL DEFAULT 'OPERATIVO';

-- AlterTable
ALTER TABLE "Reserva" ADD COLUMN     "estadoOperativo" "EstadoOperativo" NOT NULL DEFAULT 'OPERATIVO';

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "estadoOperativo" "EstadoOperativo" NOT NULL DEFAULT 'OPERATIVO';

-- DropEnum
DROP TYPE "public"."EstadoInmobiliaria";

-- DropEnum
DROP TYPE "public"."EstadoPersona";

-- CreateIndex
CREATE INDEX "Inmobiliaria_estadoOperativo_idx" ON "Inmobiliaria"("estadoOperativo");

-- CreateIndex
CREATE INDEX "Persona_estadoOperativo_idx" ON "Persona"("estadoOperativo");

-- CreateIndex
CREATE INDEX "idx_reserva_estado_operativo" ON "Reserva"("estadoOperativo");

-- CreateIndex
CREATE INDEX "idx_venta_estado_operativo" ON "Venta"("estadoOperativo");
