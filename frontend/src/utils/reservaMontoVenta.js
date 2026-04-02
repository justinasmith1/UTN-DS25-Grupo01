/**
 * Monto de venta esperado desde una reserva ACTIVA o ACEPTADA.
 * Debe coincidir con Backend/src/domain/reserva/reservaMontoVenta.utils.ts
 * @param {object | null | undefined} reserva
 * @returns {number | null}
 */
export function montoVentaDesdeReserva(reserva) {
  if (!reserva) return null;
  const e = String(reserva.estado || "").toUpperCase();
  if (e === "ACTIVA") {
    const v = reserva.ofertaInicial;
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  if (e === "ACEPTADA") {
    const v = reserva.ofertaActual;
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
