-- CreateEnum
CREATE TYPE "public"."EstadoLote" AS ENUM ('ALQUILADO', 'DISPONIBLE', 'EN_PROMOCION', 'NO_DISPONIBLE', 'RESERVADO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "public"."SubestadoLote" AS ENUM ('CONSTRUIDO', 'NO_CONSTRUIDO', 'EN_CONSTRUCCION');

-- CreateEnum
CREATE TYPE "public"."NombreCalle" AS ENUM ('REINAMORA', 'MACA', 'ZORZAL', 'CAUQUEN', 'ALONDRA', 'JACANA', 'TACUARITO', 'JILGUERO', 'GOLONDRINA', 'CALANDRIA', 'AGUILAMORA', 'LORCA', 'MILANO');

-- CreateEnum
CREATE TYPE "public"."TipoLote" AS ENUM ('LOTE_VENTA', 'ESPACIO_COMUN');

-- CreateTable
CREATE TABLE "public"."Lote" (
    "id" SERIAL NOT NULL,
    "tipo" "public"."TipoLote" NOT NULL,
    "descripcion" TEXT,
    "estado" "public"."EstadoLote" NOT NULL DEFAULT 'DISPONIBLE',
    "subestado" "public"."SubestadoLote" NOT NULL DEFAULT 'NO_CONSTRUIDO',
    "fondo" DECIMAL(8,2),
    "frente" DECIMAL(8,2),
    "numPartido" INTEGER NOT NULL DEFAULT 62,
    "superficie" DECIMAL(10,2),
    "alquiler" BOOLEAN,
    "deuda" BOOLEAN,
    "precio" DECIMAL(12,2),
    "nombreEspacioComun" TEXT,
    "capacidad" INTEGER,
    "fraccionId" INTEGER NOT NULL,
    "propietarioId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3),

    CONSTRAINT "Lote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ubicacion" (
    "id" SERIAL NOT NULL,
    "loteId" INTEGER NOT NULL,
    "calle" "public"."NombreCalle" NOT NULL,
    "numero" INTEGER NOT NULL,

    CONSTRAINT "Ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Fraccion" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,

    CONSTRAINT "Fraccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ubicacion_loteId_key" ON "public"."Ubicacion"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "Fraccion_numero_key" ON "public"."Fraccion"("numero");

-- AddForeignKey
ALTER TABLE "public"."Reserva" ADD CONSTRAINT "Reserva_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lote" ADD CONSTRAINT "Lote_fraccionId_fkey" FOREIGN KEY ("fraccionId") REFERENCES "public"."Fraccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lote" ADD CONSTRAINT "Lote_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "public"."Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ubicacion" ADD CONSTRAINT "Ubicacion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "public"."Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
