-- AlterTable
ALTER TABLE "public"."Reserva" ADD COLUMN     "loteEstadoAlCrear" "public"."EstadoLote" NOT NULL DEFAULT 'DISPONIBLE';
