/**
 * Utilidades compartidas del submódulo Pagos (frontend).
 */

/**
 * Indica si una cuota está vencida: fechaVencimiento < hoy (a nivel día) y saldoPendiente > 0.
 * @param {string|Date} fechaVencimiento - Fecha de vencimiento
 * @param {number} saldoPendiente - Saldo pendiente de la cuota
 * @returns {boolean}
 */
export function estaCuotaVencida(fechaVencimiento, saldoPendiente) {
  if (saldoPendiente <= 0) return false;
  if (!fechaVencimiento) return false;
  try {
    const vto = new Date(fechaVencimiento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    vto.setHours(0, 0, 0, 0);
    return vto.getTime() < hoy.getTime();
  } catch {
    return false;
  }
}
