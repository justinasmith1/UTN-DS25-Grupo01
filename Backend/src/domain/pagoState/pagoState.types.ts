// domain/pagoState/pagoState.types.ts
// Tipos mínimos para cálculos y estados del submódulo Pagos (sin dependencia de Prisma)

import type { EstadoCuota, EstadoCobro } from '../../generated/prisma';

/** Estados de cuota persistidos. VENCIDA no se persiste. */
export type EstadoCuotaPersistido = EstadoCuota;

/** Estados de cobro de venta. */
export type EstadoCobroValor = EstadoCobro;

/** Cuota mínima para evaluar secuencia, vencimiento y primera pendiente */
export interface CuotaParaEvaluacion {
  numeroCuota: number;
  fechaVencimiento: Date;
  saldoPendiente: number;
}
