// ===================
// Core de búsqueda reutilizable para todos los módulos
// ===================

/** Normaliza texto: lower, sin tildes, trim, colapsa espacios múltiples */
export const normalizeText = (str) => {
  if (!str) return '';
  return String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ');
};

/** Divide el texto de búsqueda en tokens */
export const tokenizeSearch = (searchText) => {
  if (!searchText) return [];
  const normalized = normalizeText(searchText);
  return normalized.split(/\s+/).filter(token => token.length > 0);
};

/**
 * Verifica si un token matchea contra un campo
 * - includes sobre el string completo normalizado
 * - startsWith por palabra (para que "p" matchee con "perez" por ejemplo)
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
 * Verifica si un item matchea con el texto de búsqueda usando campos específicos
 * @param {string} searchText - Texto de búsqueda
 * @param {string[]} fieldsArray - Array de strings (valores de campos ya normalizados o extraídos del item)
 * @returns {boolean}
 */
export const matchesSearchByFields = (searchText, fieldsArray) => {
  if (!searchText || !searchText.trim()) return true;
  
  const tokens = tokenizeSearch(searchText);
  if (tokens.length === 0) return true;
  
  // Cada token debe matchear con al menos un campo
  return tokens.every(token => 
    fieldsArray.some(field => tokenMatchesField(token, field))
  );
};

/**
 * Aplica búsqueda a una lista de items usando una función que extrae campos buscables
 * @param {any[]} items - Array de items a filtrar
 * @param {string} searchText - Texto de búsqueda
 * @param {Function} getSearchFieldsFn - Función que recibe un item y devuelve array de strings (campos buscables)
 * @returns {any[]} - Array filtrado
 */
export const applySearch = (items, searchText, getSearchFieldsFn) => {
  if (!items || !Array.isArray(items)) return [];
  if (!searchText || !searchText.trim()) return items;
  
  return items.filter(item => {
    const fields = getSearchFieldsFn(item);
    // Filtrar null/undefined del array de campos
    const validFields = fields.filter(Boolean);
    return matchesSearchByFields(searchText, validFields);
  });
};
