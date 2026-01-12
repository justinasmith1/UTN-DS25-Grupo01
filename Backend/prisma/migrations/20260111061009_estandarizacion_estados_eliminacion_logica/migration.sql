/*
  Warnings:

  - The values [ACTIVA,INACTIVA] on the enum `EstadoInmobiliaria` will be removed. If these variants are still used in the database, this will fail.
  - The values [ACTIVA,INACTIVA] on the enum `EstadoPersona` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EstadoInmobiliaria_new" AS ENUM ('OPERATIVO', 'ELIMINADO');
ALTER TABLE "public"."Inmobiliaria" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Inmobiliaria" ALTER COLUMN "estado" TYPE "EstadoInmobiliaria_new" USING ("estado"::text::"EstadoInmobiliaria_new");
ALTER TYPE "EstadoInmobiliaria" RENAME TO "EstadoInmobiliaria_old";
ALTER TYPE "EstadoInmobiliaria_new" RENAME TO "EstadoInmobiliaria";
DROP TYPE "public"."EstadoInmobiliaria_old";
ALTER TABLE "Inmobiliaria" ALTER COLUMN "estado" SET DEFAULT 'OPERATIVO';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoPersona_new" AS ENUM ('OPERATIVO', 'ELIMINADO');
ALTER TABLE "public"."Persona" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "Persona" ALTER COLUMN "estado" TYPE "EstadoPersona_new" USING ("estado"::text::"EstadoPersona_new");
ALTER TYPE "EstadoPersona" RENAME TO "EstadoPersona_old";
ALTER TYPE "EstadoPersona_new" RENAME TO "EstadoPersona";
DROP TYPE "public"."EstadoPersona_old";
ALTER TABLE "Persona" ALTER COLUMN "estado" SET DEFAULT 'OPERATIVO';
COMMIT;

-- AlterTable
ALTER TABLE "Inmobiliaria" ALTER COLUMN "estado" SET DEFAULT 'OPERATIVO';

-- AlterTable
ALTER TABLE "Persona" ALTER COLUMN "estado" SET DEFAULT 'OPERATIVO';
