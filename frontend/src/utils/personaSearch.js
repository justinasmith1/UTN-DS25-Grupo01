// ===================
// Helpers para búsqueda de personas (client-side)
// ===================

/**
 * Normaliza texto: lower, sin tildes, trim, colapsa espacios múltiples
 */
export const normalizeText = (str) => {
  if (!str) return '';
  
  return String(str)
    .toLowerCase()
    .normalize('NFD') // Descompone caracteres con tildes
    .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (tildes)
    .trim()
    .replace(/\s+/g, ' '); // Colapsa espacios múltiples
};

/**
 * Divide el texto de búsqueda en tokens
 */
export const tokenizeSearch = (searchText) => {
  if (!searchText) return [];
  
  const normalized = normalizeText(searchText);
  return normalized
    .split(/\s+/)
    .filter(token => token.length > 0);
};

/**
 * Verifica si un token matchea contra un campo
 * - includes sobre el string completo normalizado
 * - startsWith por palabra (para que "p" matchee con "perez")
 */
export const tokenMatchesField = (token, fieldValue) => {
  if (!fieldValue) return false;
  
  const normalizedField = normalizeText(String(fieldValue));
  
  // Match completo (includes)
  if (normalizedField.includes(token)) return true;
  
  // Match por palabra (startsWith)
  const words = normalizedField.split(/\s+/);
  return words.some(word => word.startsWith(token));
};

/**
 * Verifica si una persona matchea con el texto de búsqueda
 */
export const matchesSearch = (persona, searchText) => {
  if (!searchText || !searchText.trim()) return true;
  
  const tokens = tokenizeSearch(searchText);
  if (tokens.length === 0) return true;
  
  // Campos a buscar
  const searchFields = [
    // DisplayName (razonSocial o nombre+apellido)
    persona.razonSocial || `${persona.nombre || ''} ${persona.apellido || ''}`.trim(),
    // Campos individuales
    persona.nombre,
    persona.apellido,
    persona.razonSocial,
    persona.email,
    persona.contacto,
    persona.telefono?.toString(),
    // Identificador
    persona.identificadorValor,
    persona.cuil,
    // Identificador formateado (ej: "DNI 12345678", "CUIL 20123456789")
    persona.identificadorTipo && persona.identificadorValor
      ? `${persona.identificadorTipo} ${persona.identificadorValor}`
      : null,
  ].filter(Boolean);
  
  // Cada token debe matchear con al menos un campo
  return tokens.every(token => 
    searchFields.some(field => tokenMatchesField(token, field))
  );
};

/**
 * Aplica búsqueda a una lista de personas
 */
export const applySearch = (personas, searchText) => {
  if (!personas || !Array.isArray(personas)) return [];
  if (!searchText || !searchText.trim()) return personas;
  
  return personas.filter(persona => matchesSearch(persona, searchText));
};
