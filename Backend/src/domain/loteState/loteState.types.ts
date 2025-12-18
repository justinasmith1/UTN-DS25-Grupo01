// domain/loteState/loteState.types.ts
// Tipos y constantes canónicas para estados de lote (fuente única de verdad)

export type EstadoLoteOp = 'Disponible' | 'Reservado' | 'Vendido' | 'En Promoción' | 'Con Prioridad' | 'No Disponible' | 'Alquilado';

export const ESTADO_LOTE_OP = {
  DISPONIBLE: 'Disponible',
  RESERVADO: 'Reservado',
  VENDIDO: 'Vendido',
  EN_PROMOCION: 'En Promoción',
  CON_PRIORIDAD: 'Con Prioridad',
  NO_DISPONIBLE: 'No Disponible',
  ALQUILADO: 'Alquilado',
} as const;

// Helpers simples para claridad
export function isNoDisponible(estado: EstadoLoteOp | string): boolean {
  return estado === ESTADO_LOTE_OP.NO_DISPONIBLE;
}

export function isVendido(estado: EstadoLoteOp | string): boolean {
  return estado === ESTADO_LOTE_OP.VENDIDO;
}

export function isAlquilado(estado: EstadoLoteOp | string): boolean {
  return estado === ESTADO_LOTE_OP.ALQUILADO;
}
