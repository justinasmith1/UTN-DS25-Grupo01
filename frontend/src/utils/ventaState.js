// src/utils/ventaState.js
// Helper para transiciones de estado de Ventas (Etapa 1)
// Sincronizado con Backend/src/domain/ventaState/ventaState.rules.ts

/**
 * Estados válidos de una venta
 */
export const ESTADO_VENTA = {
  INICIADA: 'INICIADA',
  CON_BOLETO: 'CON_BOLETO',
  ESCRITURADO: 'ESCRITURADO',
  CANCELADA: 'CANCELADA',
};

/**
 * Labels legibles para cada estado
 */
export const ESTADO_VENTA_LABELS = {
  [ESTADO_VENTA.INICIADA]: 'Iniciada',
  [ESTADO_VENTA.CON_BOLETO]: 'Con Boleto',
  [ESTADO_VENTA.ESCRITURADO]: 'Escriturado',
  [ESTADO_VENTA.CANCELADA]: 'Cancelada',
};

/**
 * Estados de cobro válidos (Etapa 2)
 */
export const ESTADO_COBRO = {
  PENDIENTE: 'PENDIENTE',
  EN_CURSO: 'EN_CURSO',
  PAGO_COMPLETO: 'PAGO_COMPLETO',
};

/**
 * Labels legibles para estados de cobro
 */
export const ESTADO_COBRO_LABELS = {
  [ESTADO_COBRO.PENDIENTE]: 'Pendiente',
  [ESTADO_COBRO.EN_CURSO]: 'En Curso',
  [ESTADO_COBRO.PAGO_COMPLETO]: 'Pago Completo',
};

/**
 * Opciones para selector de estado de cobro
 */
export const OPCIONES_ESTADO_COBRO = [
  { value: ESTADO_COBRO.PENDIENTE, label: ESTADO_COBRO_LABELS[ESTADO_COBRO.PENDIENTE] },
  { value: ESTADO_COBRO.EN_CURSO, label: ESTADO_COBRO_LABELS[ESTADO_COBRO.EN_CURSO] },
  { value: ESTADO_COBRO.PAGO_COMPLETO, label: ESTADO_COBRO_LABELS[ESTADO_COBRO.PAGO_COMPLETO] },
];

/**
 * Transiciones permitidas desde cada estado (Etapa 1)
 * Refleja la máquina de estados del backend
 */
export const TRANSICIONES_PERMITIDAS = {
  [ESTADO_VENTA.INICIADA]: [
    ESTADO_VENTA.CON_BOLETO,
    ESTADO_VENTA.ESCRITURADO,
    ESTADO_VENTA.CANCELADA,
  ],
  [ESTADO_VENTA.CON_BOLETO]: [
    ESTADO_VENTA.ESCRITURADO,
    ESTADO_VENTA.CANCELADA,
  ],
  [ESTADO_VENTA.ESCRITURADO]: [], // Estado terminal
  [ESTADO_VENTA.CANCELADA]: [],   // Estado terminal
};

/**
 * Verifica si un estado es terminal (no permite más transiciones)
 * @param {string} estado - Estado actual
 * @returns {boolean}
 */
export function esEstadoTerminal(estado) {
  if (!estado) return false;
  const estadoUpper = String(estado).toUpperCase().trim();
  const transiciones = TRANSICIONES_PERMITIDAS[estadoUpper] || [];
  return transiciones.length === 0;
}

/**
 * Obtiene los estados a los que se puede transicionar desde el estado actual
 * @param {string} estadoActual - Estado actual de la venta
 * @returns {Array<{value: string, label: string}>} - Array de opciones para selector
 */
export function getEstadosDisponibles(estadoActual) {
  if (!estadoActual) return [];
  
  const estadoUpper = String(estadoActual).toUpperCase().trim();
  const transiciones = TRANSICIONES_PERMITIDAS[estadoUpper] || [];
  
  // Siempre incluir el estado actual como primera opción
  const opciones = [
    {
      value: estadoUpper,
      label: ESTADO_VENTA_LABELS[estadoUpper] || estadoUpper,
      esCurrent: true,
    },
  ];
  
  // Agregar estados a los que puede transicionar
  transiciones.forEach((estado) => {
    opciones.push({
      value: estado,
      label: ESTADO_VENTA_LABELS[estado] || estado,
      esCurrent: false,
    });
  });
  
  return opciones;
}

/**
 * Verifica si una transición de estado es válida
 * @param {string} estadoActual - Estado actual
 * @param {string} estadoNuevo - Estado al que se quiere transicionar
 * @returns {boolean}
 */
export function esTransicionValida(estadoActual, estadoNuevo) {
  if (!estadoActual || !estadoNuevo) return false;
  
  const actualUpper = String(estadoActual).toUpperCase().trim();
  const nuevoUpper = String(estadoNuevo).toUpperCase().trim();
  
  // Si es el mismo estado, es válido (no hay transición)
  if (actualUpper === nuevoUpper) return true;
  
  const transiciones = TRANSICIONES_PERMITIDAS[actualUpper] || [];
  return transiciones.includes(nuevoUpper);
}

/**
 * Obtiene mensaje de hint para estados terminales
 * @param {string} estado - Estado actual
 * @returns {string|null}
 */
export function getMensajeEstadoTerminal(estado) {
  if (!esEstadoTerminal(estado)) return null;
  
  const estadoUpper = String(estado).toUpperCase().trim();
  
  if (estadoUpper === ESTADO_VENTA.ESCRITURADO) {
    return 'La venta está escriturada. Este estado no permite cambios.';
  }
  
  if (estadoUpper === ESTADO_VENTA.CANCELADA) {
    return 'La venta está cancelada. Este estado no permite cambios.';
  }
  
  return 'Este estado no permite cambios.';
}

/**
 * Verifica si una venta está finalizada (derivada)
 * FINALIZADA = ESCRITURADO + PAGO_COMPLETO
 * @param {Object} venta - Objeto venta con estado y estadoCobro
 * @returns {boolean}
 */
export function isVentaFinalizada(venta) {
  if (!venta) return false;
  
  const estado = String(venta.estado || '').toUpperCase().trim();
  const estadoCobro = String(venta.estadoCobro || '').toUpperCase().trim();
  
  return estado === ESTADO_VENTA.ESCRITURADO && estadoCobro === ESTADO_COBRO.PAGO_COMPLETO;
}

/**
 * Verifica si el estadoCobro es editable según el estado de la venta
 * @param {string} estado - Estado actual de la venta
 * @returns {boolean}
 */
export function puedeEditarEstadoCobro(estado) {
  if (!estado) return false;
  
  const estadoUpper = String(estado).toUpperCase().trim();
  
  // No se puede editar estadoCobro si la venta está CANCELADA
  return estadoUpper !== ESTADO_VENTA.CANCELADA;
}

/**
 * Verifica si una venta es editable según su estado legal
 * @param {string} estado - Estado actual de la venta
 * @returns {boolean}
 */
export function esVentaEditable(estado) {
  if (!estado) return true; // default: editable
  
  const estadoUpper = String(estado).toUpperCase().trim();
  
  // CANCELADA es solo lectura
  return estadoUpper !== ESTADO_VENTA.CANCELADA;
}
