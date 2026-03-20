// domain/pagoState/pagoState.rules.ts
// Reglas puras para cálculos y estados del submódulo Pagos (sin acceso a DB, sin Prisma Client)

import { EstadoCuota, EstadoCobro } from '../../generated/prisma';
import type { CuotaParaEvaluacion } from './pagoState.types';

/**
 * montoFinanciado = montoTotalPlanificado - montoAnticipo
 */
export function calcularMontoFinanciado(
  montoTotalPlanificado: number,
  montoAnticipo: number
): number {
  return montoTotalPlanificado - montoAnticipo;
}

/**
 * montoTotalExigible = montoOriginal + montoRecargoManual
 */
export function calcularMontoTotalExigible(
  montoOriginal: number,
  montoRecargoManual: number
): number {
  return montoOriginal + montoRecargoManual;
}

/**
 * saldoPendiente = montoTotalExigible - montoPagado
 * No devuelve negativo; si hay datos inconsistentes, devuelve 0.
 */
export function calcularSaldoPendiente(
  montoTotalExigible: number,
  montoPagado: number
): number {
  const saldo = montoTotalExigible - montoPagado;
  return saldo <= 0 ? 0 : saldo;
}

/**
 * Determina el estado persistido de una cuota.
 * PENDIENTE si montoPagado <= 0
 * PAGA si saldoPendiente <= 0
 * PAGO_PARCIAL si montoPagado > 0 y saldoPendiente > 0
 * No devuelve VENCIDA.
 */
export function determinarEstadoCuota(
  montoPagado: number,
  saldoPendiente: number
): EstadoCuota {
  if (montoPagado <= 0) return EstadoCuota.PENDIENTE;
  if (saldoPendiente <= 0) return EstadoCuota.PAGA;
  return EstadoCuota.PAGO_PARCIAL;
}

/**
 * true si fechaVencimiento < fechaReferencia y saldoPendiente > 0
 * @param fechaReferencia - Si no se pasa, usa new Date() (útil para testear con fechas fijas)
 */
export function estaCuotaVencida(
  fechaVencimiento: Date,
  saldoPendiente: number,
  fechaReferencia: Date = new Date()
): boolean {
  if (saldoPendiente <= 0) return false;
  return fechaVencimiento.getTime() < fechaReferencia.getTime();
}

/**
 * Determina el estado de cobro de una venta.
 * PAGO_COMPLETO si saldoPendienteTotal <= 0
 * PENDIENTE si totalPagado <= 0
 * EN_CURSO en cualquier otro caso
 */
export function determinarEstadoCobro(
  totalPagado: number,
  saldoPendienteTotal: number
): EstadoCobro {
  if (saldoPendienteTotal <= 0) return EstadoCobro.PAGO_COMPLETO;
  if (totalPagado <= 0) return EstadoCobro.PENDIENTE;
  return EstadoCobro.EN_CURSO;
}

/**
 * Devuelve la primera cuota con saldoPendiente > 0, ordenada por numeroCuota ASC.
 * Si no hay cuotas pendientes, devuelve null.
 * No muta el array original.
 */
export function obtenerPrimeraCuotaPendiente(
  cuotas: CuotaParaEvaluacion[]
): CuotaParaEvaluacion | null {
  const ordenadas = [...cuotas].sort((a, b) => a.numeroCuota - b.numeroCuota);
  return ordenadas.find((c) => c.saldoPendiente > 0) ?? null;
}
