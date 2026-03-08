/**
 * Etapa 5.4.3 — Validación Venta ↔ Lote.
 * Asegura que la venta pertenezca al lote indicado.
 */

import prisma from "../config/prisma";

/**
 * Verifica que la venta exista y pertenezca al lote.
 * Lanza error con statusCode 400 si no.
 */
export async function ensureVentaPerteneceALote(
  ventaId: number,
  loteId: number
): Promise<void> {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    select: { loteId: true },
  });
  if (!venta) {
    const err = new Error("Venta no encontrada") as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
  if (venta.loteId !== loteId) {
    const err = new Error(
      "La venta no pertenece al mismo lote que idLoteAsociado"
    ) as Error & { statusCode?: number };
    err.statusCode = 400;
    throw err;
  }
}
