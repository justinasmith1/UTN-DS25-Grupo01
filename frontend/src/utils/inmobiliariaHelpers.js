// frontend/src/utils/inmobiliariaHelpers.js
// Helpers comunes para lógica de inmobiliarias (cupo de prioridades, etc.)

/**
 * Verifica si una inmobiliaria está saturada (no puede crear más prioridades activas)
 * @param {Object} inmobiliaria - Objeto con prioridadesActivas y maxPrioridadesActivas
 * @returns {boolean} - true si está saturada
 */
export function isInmobiliariaSaturada(inmobiliaria) {
  if (!inmobiliaria) return false;
  
  const activas = inmobiliaria.prioridadesActivas ?? 0;
  const max = inmobiliaria.maxPrioridadesActivas;
  
  // Si no tiene límite configurado (null), no está saturada
  if (max == null || max === 0) return false;
  
  return activas >= max;
}

/**
 * Formatea el cupo actual de prioridades de una inmobiliaria
 * @param {Object} inmobiliaria - Objeto con prioridadesActivas y maxPrioridadesActivas
 * @returns {string} - Formato "X/Y" o solo "X" si no hay límite
 */
export function formatCupo(inmobiliaria) {
  if (!inmobiliaria) return '0';
  
  const activas = inmobiliaria.prioridadesActivas ?? 0;
  const max = inmobiliaria.maxPrioridadesActivas;
  
  // Si no tiene límite configurado, solo mostrar activas
  if (max == null || max === 0) return String(activas);
  
  return `${activas}/${max}`;
}

/**
 * Obtiene el mensaje de tooltip para inmobiliarias saturadas
 * @param {Object} inmobiliaria - Objeto inmobiliaria
 * @returns {string} - Mensaje descriptivo
 */
export function getSaturadaTooltip(inmobiliaria) {
  if (!inmobiliaria) return '';
  
  if (isInmobiliariaSaturada(inmobiliaria)) {
    return `Límite de prioridades activas alcanzado (${formatCupo(inmobiliaria)})`;
  }
  
  return '';
}
