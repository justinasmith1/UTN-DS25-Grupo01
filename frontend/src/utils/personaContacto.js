// ===================
// Helpers para parsear email y teléfono desde contacto
// ===================

/**
 * Extrae el email de un string de contacto o usa el campo directo
 * @param {string|null|undefined} email - Campo email directo
 * @param {string|null|undefined} contacto - String de contacto que puede contener email
 * @returns {string|null} Email extraído o null
 */
export const extractEmail = (email, contacto) => {
  // Prioridad: usar campo directo
  if (email) return email;
  
  // Fallback: parsear de contacto
  if (contacto) {
    const emailMatch = contacto.match(/^[^\s@]+@[^\s@]+\.[^\s@]+/);
    return emailMatch ? emailMatch[0] : null;
  }
  
  return null;
};

/**
 * Extrae el teléfono de un string de contacto o usa el campo directo
 * @param {number|string|null|undefined} telefono - Campo telefono directo
 * @param {string|null|undefined} contacto - String de contacto que puede contener teléfono
 * @returns {string|null} Teléfono extraído como string o null
 */
export const extractTelefono = (telefono, contacto) => {
  // Prioridad: usar campo directo
  if (telefono != null) {
    return String(telefono);
  }
  
  // Fallback: parsear de contacto
  if (contacto) {
    const phoneMatch = contacto.match(/\d+/g);
    return phoneMatch ? phoneMatch.join('') : null;
  }
  
  return null;
};
