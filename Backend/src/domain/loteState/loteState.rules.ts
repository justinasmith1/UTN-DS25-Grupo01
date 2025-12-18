// domain/loteState/loteState.rules.ts
// Funciones puras que calculan decisiones de estado (reglas de negocio)

import prisma from '../../config/prisma';
import { EstadoLote, EstadoPrioridad, EstadoReserva } from '../../generated/prisma';
import { EstadoLoteOp, ESTADO_LOTE_OP } from './loteState.types';

/**
 * Calcula el estado a restaurar desde una prioridad terminada
 */
export function computeRestoreStateFromPrioridad(loteEstadoAlCrear: EstadoLote): EstadoLoteOp {
  if (loteEstadoAlCrear === EstadoLote.EN_PROMOCION) {
    return ESTADO_LOTE_OP.EN_PROMOCION;
  }
  return ESTADO_LOTE_OP.DISPONIBLE;
}

/**
 * Calcula el estado a restaurar desde una reserva terminada
 * Si la reserva nació desde CON_PRIORIDAD, la prioridad se canceló al crear la reserva,
 * por lo que siempre restaura a DISPONIBLE (o EN_PROMOCION si venía de promo)
 */
export async function computeRestoreStateFromReserva(
  loteEstadoAlCrear: EstadoLote,
  loteId: number
): Promise<EstadoLoteOp> {
  if (loteEstadoAlCrear === EstadoLote.EN_PROMOCION) {
    return ESTADO_LOTE_OP.EN_PROMOCION;
  }
  
  // Si venía de CON_PRIORIDAD, la prioridad se canceló al crear la reserva, así que restauramos a DISPONIBLE
  return ESTADO_LOTE_OP.DISPONIBLE;
}

/**
 * Valida que el lote esté operativo para una operación específica
 * Bloquea NO_DISPONIBLE (y preparado para futuros bloqueos como ALQUILADO)
 */
export function assertLoteOperableFor(operation: string, loteEstado: EstadoLote | string): void {
  const estadoStr = typeof loteEstado === 'string' ? loteEstado : loteEstado;
  
  if (estadoStr === 'NO_DISPONIBLE' || estadoStr === ESTADO_LOTE_OP.NO_DISPONIBLE) {
    const err: any = new Error(`No se puede ${operation} sobre un lote NO DISPONIBLE`);
    err.status = 400;
    throw err;
  }
  
  // Preparado para futuros bloqueos (ej: ALQUILADO para ciertas operaciones)
  // if (estadoStr === 'ALQUILADO' && operation.includes('venta')) { ... }
}

/** Valida unicidad: solo puede haber 1 reserva vigente (ACTIVA o ACEPTADA) por lote */
export async function assertReservaUnicaVigente(loteId: number): Promise<void> {
  const reservaVigente = await prisma.reserva.findFirst({
    where: {
      loteId: loteId,
      estado: { in: [EstadoReserva.ACTIVA, EstadoReserva.ACEPTADA] },
    },
    select: { id: true, estado: true },
  });

  if (reservaVigente) {
    const err: any = new Error('Ya existe una reserva vigente para este lote (Activa/Aceptada)');
    err.status = 409;
    throw err;
  }
}

/** Valida unicidad: solo puede haber 1 prioridad ACTIVA por lote, al menos definimos eso por ahora */
export async function assertPrioridadUnicaActiva(loteId: number): Promise<void> {
  const prioridadActiva = await prisma.prioridad.findFirst({
    where: {
      loteId: loteId,
      estado: EstadoPrioridad.ACTIVA,
    },
  });

  if (prioridadActiva) {
    const err: any = new Error('Ya existe una prioridad ACTIVA para este lote');
    err.status = 409;
    throw err;
  }
}
