// src/utils/prioridadHelpers.js
// Helpers para el módulo de Prioridades

/**
 * Verifica si una prioridad está eliminada lógicamente
 * @param {Object} prioridad - Objeto de prioridad
 * @returns {boolean} - true si está eliminada (estadoOperativo === 'ELIMINADO')
 */
export function isPrioridadEliminada(prioridad) {
  if (!prioridad) return false;
  const estadoOp = String(prioridad?.estadoOperativo ?? "OPERATIVO").toUpperCase();
  return estadoOp === "ELIMINADO";
}

/**
 * Verifica si una prioridad está operativa
 * @param {Object} prioridad - Objeto de prioridad
 * @returns {boolean} - true si está operativa (estadoOperativo === 'OPERATIVO' o no definido)
 */
export function isPrioridadOperativa(prioridad) {
  return !isPrioridadEliminada(prioridad);
}
