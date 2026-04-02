import type { Decimal } from '../../generated/prisma/runtime/library';
import { EstadoReserva } from '../../generated/prisma';

function toNum(val: Decimal | number): number {
  return typeof val === 'number' ? val : val.toNumber();
}

/**
 * Monto que debe tener la venta cuando nace de una reserva ACTIVA o ACEPTADA.
 * ACTIVA → oferta inicial; ACEPTADA → oferta aceptada (ofertaActual).
 */
export function montoVentaEsperadoDesdeReserva(r: {
  estado: EstadoReserva | string;
  ofertaInicial: Decimal | number;
  ofertaActual: Decimal | number;
}): number {
  const e = String(r.estado).toUpperCase();
  if (e === EstadoReserva.ACTIVA) return toNum(r.ofertaInicial);
  if (e === EstadoReserva.ACEPTADA) return toNum(r.ofertaActual);
  throw new Error(`Estado de reserva no válido para venta con reserva: ${e}`);
}

export const MONTO_VENTA_RESERVA_TOLERANCIA = 0.01;
