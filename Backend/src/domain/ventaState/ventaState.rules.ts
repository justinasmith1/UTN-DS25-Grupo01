// domain/ventaState/ventaState.rules.ts
// Reglas de negocio puras para validar transiciones y estados de venta

import { EstadoVenta } from '../../generated/prisma';
import { ESTADO_VENTA, VentaStateData, isVentaFinalizada } from './ventaState.types';

/**
 * Define las transiciones permitidas entre estados de venta.
 * Matriz de adyacencia: [desde] → [hacia]
 */
const TRANSICIONES_PERMITIDAS: Record<EstadoVenta, EstadoVenta[]> = {
  [ESTADO_VENTA.INICIADA]: [
    ESTADO_VENTA.CON_BOLETO,
    ESTADO_VENTA.ESCRITURADO,
    ESTADO_VENTA.CANCELADA,
  ],
  [ESTADO_VENTA.CON_BOLETO]: [
    ESTADO_VENTA.ESCRITURADO,
    ESTADO_VENTA.CANCELADA,
  ],
  [ESTADO_VENTA.ESCRITURADO]: [
    // No se puede retroceder ni cancelar desde ESCRITURADO
  ],
  [ESTADO_VENTA.CANCELADA]: [
    // No se puede retroceder desde CANCELADA
  ],
};

/**
 * Valida que la transición de estado sea permitida según las reglas de negocio.
 * @throws Error si la transición no es válida
 */
export function assertTransicionEstadoValida(
  estadoActual: EstadoVenta,
  estadoNuevo: EstadoVenta
): void {
  // Si no hay cambio, es válido
  if (estadoActual === estadoNuevo) {
    return;
  }

  const transicionesPermitidas = TRANSICIONES_PERMITIDAS[estadoActual] || [];
  
  if (!transicionesPermitidas.includes(estadoNuevo)) {
    const err: any = new Error(
      `Transición de estado inválida: no se puede pasar de ${estadoActual} a ${estadoNuevo}`
    );
    err.status = 400;
    throw err;
  }
}

/**
 * Valida que una venta pueda ser eliminada (soft delete).
 * Solo se puede eliminar si:
 * - estado == CANCELADA, o
 * - la venta está FINALIZADA (ESCRITURADO + PAGO_COMPLETO)
 * 
 * @throws Error si la venta no puede eliminarse
 */
export function assertVentaEliminable(venta: VentaStateData): void {
  const esCancelada = venta.estado === ESTADO_VENTA.CANCELADA;
  const esFinalizada = isVentaFinalizada(venta);

  if (!esCancelada && !esFinalizada) {
    const err: any = new Error(
      `No se puede eliminar una venta en estado ${venta.estado}. ` +
      `Solo se pueden eliminar ventas CANCELADAS o FINALIZADAS (ESCRITURADO + PAGO_COMPLETO).`
    );
    err.status = 409;
    throw err;
  }
}

/**
 * Valida que los campos obligatorios estén presentes según el estado de la venta.
 * 
 * Reglas:
 * - ESCRITURADO → fechaEscrituraReal obligatoria
 * - CANCELADA → fechaCancelacion y motivoCancelacion obligatorios
 * 
 * @throws Error si faltan campos obligatorios
 */
export function assertCamposObligatoriosPorEstado(
  estado: EstadoVenta,
  data: Partial<VentaStateData>
): void {
  if (estado === ESTADO_VENTA.ESCRITURADO) {
    if (!data.fechaEscrituraReal) {
      const err: any = new Error(
        'El campo fechaEscrituraReal es obligatorio para el estado ESCRITURADO'
      );
      err.status = 400;
      throw err;
    }
  }

  if (estado === ESTADO_VENTA.CANCELADA) {
    if (!data.fechaCancelacion) {
      const err: any = new Error(
        'El campo fechaCancelacion es obligatorio para el estado CANCELADA'
      );
      err.status = 400;
      throw err;
    }
    if (!data.motivoCancelacion || data.motivoCancelacion.trim() === '') {
      const err: any = new Error(
        'El campo motivoCancelacion es obligatorio para el estado CANCELADA'
      );
      err.status = 400;
      throw err;
    }
  }
}
