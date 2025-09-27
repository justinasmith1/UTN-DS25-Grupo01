-- CreateEnum
CREATE TYPE "public"."TiposArchivos" AS ENUM ('BOLETO', 'ESCRITURA', 'PLANO', 'IMAGEN');

-- CreateTable
CREATE TABLE "public"."Archivos" (
    "id" SERIAL NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "linkArchivo" TEXT NOT NULL,
    "tipo" "public"."TiposArchivos" NOT NULL,
    "idLoteAsociado" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Archivos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Archivos" ADD CONSTRAINT "Archivos_idLoteAsociado_fkey" FOREIGN KEY ("idLoteAsociado") REFERENCES "public"."Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
