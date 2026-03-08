-- CreateEnum
CREATE TYPE "EstadoAprobacionPlano" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "Archivos" ADD COLUMN     "aprobadoComisionBy" TEXT,
ADD COLUMN     "aprobadoMunicipioBy" TEXT,
ADD COLUMN     "estadoAprobacionComision" "EstadoAprobacionPlano",
ADD COLUMN     "estadoAprobacionMunicipio" "EstadoAprobacionPlano",
ADD COLUMN     "fechaAprobacionComision" TIMESTAMP(3),
ADD COLUMN     "fechaAprobacionMunicipio" TIMESTAMP(3),
ADD COLUMN     "observacionAprobacionComision" TEXT,
ADD COLUMN     "observacionAprobacionMunicipio" TEXT;
