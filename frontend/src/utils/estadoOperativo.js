// src/utils/estadoOperativo.js
// Helpers genéricos para manejar estado operativo (OPERATIVO/ELIMINADO)
// Funciona para Prioridades, Reservas y Ventas

/**
 * Normaliza un valor de estado operativo
 * @param {string|null|undefined} value - Valor a normalizar
 * @returns {string} - "OPERATIVO" o "ELIMINADO" (default "OPERATIVO")
 */
export function normalizeEstadoOperativo(value) {
  if (!value) return "OPERATIVO";
  const normalized = String(value).toUpperCase().trim();
  return normalized === "ELIMINADO" ? "ELIMINADO" : "OPERATIVO";
}

/**
 * Obtiene el estado operativo de una entidad
 * Prioridades/Reservas/Ventas: usa entity.estadoOperativo (campo unificado)
 * Fallback: usa entity.estado (si es OPERATIVO o ELIMINADO) para compatibilidad
 * @param {Object} entity - Entidad (prioridad, reserva, venta)
 * @returns {string} - "OPERATIVO" o "ELIMINADO"
 */
function getEstadoOperativo(entity) {
  if (!entity) return "OPERATIVO";
  
  // Prioridad: usar campo estadoOperativo directamente
  // Reservas/Ventas: ahora también tienen estadoOperativo unificado
  if (entity.estadoOperativo != null) {
    return normalizeEstadoOperativo(entity.estadoOperativo);
  }
  
  // Fallback: derivar de estado solo si es OPERATIVO/ELIMINADO (compatibilidad con datos antiguos)
  if (entity.estado != null) {
    const estadoStr = String(entity.estado).toUpperCase().trim();
    if (estadoStr === "OPERATIVO" || estadoStr === "ELIMINADO") {
      return normalizeEstadoOperativo(estadoStr);
    }
  }
  
  // Default: OPERATIVO
  return "OPERATIVO";
}

/**
 * Verifica si una entidad está eliminada lógicamente
 * @param {Object} entity - Entidad (prioridad, reserva, venta)
 * @returns {boolean} - true si está eliminada
 */
export function isEliminado(entity) {
  return getEstadoOperativo(entity) === "ELIMINADO";
}

/**
 * Verifica si una entidad está operativa
 * @param {Object} entity - Entidad (prioridad, reserva, venta)
 * @returns {boolean} - true si está operativa
 */
export function isOperativo(entity) {
  return getEstadoOperativo(entity) === "OPERATIVO";
}

/**
 * Verifica si una entidad puede editarse según su estado operativo
 * Solo las entidades OPERATIVAS pueden editarse
 * @param {Object} entity - Entidad (prioridad, reserva, venta)
 * @returns {boolean} - true si puede editarse (es operativa)
 */
export function canEditByEstadoOperativo(entity) {
  return isOperativo(entity);
}

/**
 * Determina si una entidad puede ser seleccionada para "Ver en mapa"
 * Solo se pueden seleccionar entidades OPERATIVAS
 * @param {Object} entity - La entidad a verificar
 * @returns {boolean}
 */
export function canSelectForMap(entity) {
  return isOperativo(entity);
}

/**
 * Verifica si una reserva puede eliminarse lógicamente según su estado comercial
 * Solo se pueden eliminar reservas en estado: CANCELADA, EXPIRADA, RECHAZADA
 * @param {Object} reserva - Reserva con campo estado
 * @returns {boolean} - true si puede eliminarse lógicamente
 */
export function canDeleteReserva(reserva) {
  if (!reserva) return false;
  
  // Debe estar operativa para poder eliminarse
  if (!isOperativo(reserva)) return false;
  
  const estado = reserva.estado;
  if (!estado) return false;
  
  const estadoStr = String(estado).toUpperCase().trim();
  const estadosPermitidos = ['CANCELADA', 'EXPIRADA', 'RECHAZADA'];
  
  return estadosPermitidos.includes(estadoStr);
}

/**
 * Obtiene el mensaje de tooltip para cuando no se puede eliminar una reserva
 * @param {Object} reserva - Reserva con campo estado
 * @returns {string} - Mensaje explicativo
 */
export function getReservaDeleteTooltip(reserva) {
  if (!reserva) return 'No se puede eliminar esta reserva';
  
  const estado = reserva.estado;
  if (!estado) return 'No se puede eliminar esta reserva';
  
  const estadoStr = String(estado).toUpperCase().trim();
  return `No se puede eliminar una reserva en estado ${estadoStr}`;
}

/**
 * Verifica si una venta puede eliminarse lógicamente según su estado comercial
 * Solo se pueden eliminar ventas en estado: CANCELADA
 * @param {Object} venta - Venta con campo estado
 * @returns {boolean} - true si puede eliminarse lógicamente
 */
export function canDeleteVenta(venta) {
  if (!venta) return false;
  
  // Debe estar operativa para poder eliminarse
  if (!isOperativo(venta)) return false;
  
  const estado = venta.estado;
  if (!estado) return false;
  
  const estadoStr = String(estado).toUpperCase().trim();
  const estadosPermitidos = ['CANCELADA'];
  
  return estadosPermitidos.includes(estadoStr);
}

/**
 * Obtiene el mensaje de tooltip para cuando no se puede eliminar una venta
 * @param {Object} venta - Venta con campo estado
 * @returns {string} - Mensaje explicativo
 */
export function getVentaDeleteTooltip(venta) {
  if (!venta) return 'No se puede eliminar esta venta';
  
  const estado = venta.estado;
  if (!estado) return 'No se puede eliminar esta venta';
  
  const estadoStr = String(estado).toUpperCase().trim();
  return `No se puede eliminar una venta en estado ${estadoStr}`;
}
