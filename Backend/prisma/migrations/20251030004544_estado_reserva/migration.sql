-- CreateEnum
CREATE TYPE "public"."EstadoReserva" AS ENUM ('ACTIVA', 'CANCELADA', 'ACEPTADA');

-- AlterTable
ALTER TABLE "public"."Reserva" ADD COLUMN     "estado" "public"."EstadoReserva" NOT NULL DEFAULT 'ACTIVA';
