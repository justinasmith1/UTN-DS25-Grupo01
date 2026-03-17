-- CreateEnum
CREATE TYPE "EstadoPlanPago" AS ENUM ('VIGENTE', 'REEMPLAZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoFinanciacion" AS ENUM ('CONTADO', 'ANTICIPO_CUOTAS', 'CUOTAS_FIJAS', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "TipoCuota" AS ENUM ('ANTICIPO', 'CUOTA', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PAGO_PARCIAL', 'PAGA');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'CHEQUE', 'OTRO');

-- CreateTable
CREATE TABLE "PlanPago" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "estadoPlan" "EstadoPlanPago" NOT NULL DEFAULT 'VIGENTE',
    "tipoFinanciacion" "TipoFinanciacion" NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "cantidadCuotas" INTEGER NOT NULL,
    "montoTotalPlanificado" DECIMAL(12,2) NOT NULL,
    "montoFinanciado" DECIMAL(12,2) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "esVigente" BOOLEAN NOT NULL DEFAULT true,
    "montoAnticipo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3),
    "createdBy" TEXT,

    CONSTRAINT "PlanPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuotaPlanPago" (
    "id" SERIAL NOT NULL,
    "planPagoId" INTEGER NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "tipoCuota" "TipoCuota" NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "montoOriginal" DECIMAL(12,2) NOT NULL,
    "montoRecargoManual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "montoTotalExigible" DECIMAL(12,2) NOT NULL,
    "montoPagado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saldoPendiente" DECIMAL(12,2) NOT NULL,
    "estadoCuota" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',
    "descripcion" TEXT,
    "fechaPagoCompleto" TIMESTAMP(3),
    "observacion" TEXT,
    "motivoRecargo" TEXT,
    "recargoAplicadoBy" TEXT,
    "fechaAplicacionRecargo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3),

    CONSTRAINT "CuotaPlanPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoRegistrado" (
    "id" SERIAL NOT NULL,
    "ventaId" INTEGER NOT NULL,
    "planPagoId" INTEGER NOT NULL,
    "cuotaId" INTEGER NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "medioPago" "MedioPago" NOT NULL,
    "referencia" TEXT,
    "observacion" TEXT,
    "registradoBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoRegistrado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanPago_ventaId_idx" ON "PlanPago"("ventaId");

-- CreateIndex
CREATE INDEX "PlanPago_ventaId_estadoPlan_idx" ON "PlanPago"("ventaId", "estadoPlan");

-- CreateIndex
CREATE INDEX "PlanPago_ventaId_esVigente_idx" ON "PlanPago"("ventaId", "esVigente");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPago_ventaId_version_key" ON "PlanPago"("ventaId", "version");

-- CreateIndex
CREATE INDEX "CuotaPlanPago_planPagoId_idx" ON "CuotaPlanPago"("planPagoId");

-- CreateIndex
CREATE INDEX "CuotaPlanPago_planPagoId_estadoCuota_idx" ON "CuotaPlanPago"("planPagoId", "estadoCuota");

-- CreateIndex
CREATE INDEX "CuotaPlanPago_planPagoId_fechaVencimiento_idx" ON "CuotaPlanPago"("planPagoId", "fechaVencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "CuotaPlanPago_planPagoId_numeroCuota_key" ON "CuotaPlanPago"("planPagoId", "numeroCuota");

-- CreateIndex
CREATE INDEX "PagoRegistrado_ventaId_idx" ON "PagoRegistrado"("ventaId");

-- CreateIndex
CREATE INDEX "PagoRegistrado_planPagoId_idx" ON "PagoRegistrado"("planPagoId");

-- CreateIndex
CREATE INDEX "PagoRegistrado_cuotaId_idx" ON "PagoRegistrado"("cuotaId");

-- CreateIndex
CREATE INDEX "PagoRegistrado_fechaPago_idx" ON "PagoRegistrado"("fechaPago");

-- AddForeignKey
ALTER TABLE "PlanPago" ADD CONSTRAINT "PlanPago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuotaPlanPago" ADD CONSTRAINT "CuotaPlanPago_planPagoId_fkey" FOREIGN KEY ("planPagoId") REFERENCES "PlanPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoRegistrado" ADD CONSTRAINT "PagoRegistrado_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoRegistrado" ADD CONSTRAINT "PagoRegistrado_planPagoId_fkey" FOREIGN KEY ("planPagoId") REFERENCES "PlanPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoRegistrado" ADD CONSTRAINT "PagoRegistrado_cuotaId_fkey" FOREIGN KEY ("cuotaId") REFERENCES "CuotaPlanPago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
