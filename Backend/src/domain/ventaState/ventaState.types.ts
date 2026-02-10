// domain/ventaState/ventaState.types.ts
// Tipos y constantes canónicas para estados de venta (fuente única de verdad)

import { EstadoVenta, EstadoCobro } from '../../generated/prisma';

// Estados de venta oficiales
export const ESTADO_VENTA = {
  INICIADA: EstadoVenta.INICIADA,
  CON_BOLETO: EstadoVenta.CON_BOLETO,
  ESCRITURADO: EstadoVenta.ESCRITURADO,
  CANCELADA: EstadoVenta.CANCELADA,
} as const;

// Estados de cobro oficiales
export const ESTADO_COBRO = {
  PENDIENTE: EstadoCobro.PENDIENTE,
  EN_CURSO: EstadoCobro.EN_CURSO,
  PAGO_COMPLETO: EstadoCobro.PAGO_COMPLETO,
} as const;

// Tipo auxiliar para validaciones
export interface VentaStateData {
  estado: EstadoVenta;
  estadoCobro: EstadoCobro;
  fechaEscrituraReal?: Date | null;
  fechaCancelacion?: Date | null;
  motivoCancelacion?: string | null;
}

// Helpers simples para claridad
export function isEstadoEscriturado(estado: EstadoVenta): boolean {
  return estado === ESTADO_VENTA.ESCRITURADO;
}

export function isEstadoCancelada(estado: EstadoVenta): boolean {
  return estado === ESTADO_VENTA.CANCELADA;
}

export function isEstadoPagoCompleto(estadoCobro: EstadoCobro): boolean {
  return estadoCobro === ESTADO_COBRO.PAGO_COMPLETO;
}

/**
 * Una venta es FINALIZADA cuando:
 * - estado == ESCRITURADO
 * - estadoCobro == PAGO_COMPLETO
 * 
 * Esta es una condición derivada, NO un estado persistido.
 */
export function isVentaFinalizada(venta: VentaStateData): boolean {
  return (
    venta.estado === ESTADO_VENTA.ESCRITURADO &&
    venta.estadoCobro === ESTADO_COBRO.PAGO_COMPLETO
  );
}
