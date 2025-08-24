-- CreateTable
CREATE TABLE "public"."Inmobiliaria" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "comxventa" DECIMAL(5,2) NOT NULL,
    "contacto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3),

    CONSTRAINT "Inmobiliaria_pkey" PRIMARY KEY ("id")
);
