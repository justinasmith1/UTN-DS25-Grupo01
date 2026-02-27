-- CreateTable
CREATE TABLE "_VentaCompradores" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_VentaCompradores_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_VentaCompradores_B_index" ON "_VentaCompradores"("B");

-- AddForeignKey
ALTER TABLE "_VentaCompradores" ADD CONSTRAINT "_VentaCompradores_A_fkey" FOREIGN KEY ("A") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VentaCompradores" ADD CONSTRAINT "_VentaCompradores_B_fkey" FOREIGN KEY ("B") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
