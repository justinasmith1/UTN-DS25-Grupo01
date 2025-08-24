/*
  Warnings:

  - Made the column `updateAt` on table `Persona` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Persona" ALTER COLUMN "updateAt" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Reserva" ADD CONSTRAINT "Reserva_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reserva" ADD CONSTRAINT "Reserva_inmobiliariaId_fkey" FOREIGN KEY ("inmobiliariaId") REFERENCES "public"."Inmobiliaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
