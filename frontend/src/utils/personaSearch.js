// ===================
// Helpers para búsqueda de personas
// ===================
// Refactorizado para usar el core común de búsqueda

import { applySearch as applySearchCore } from './search/searchCore';
import { getPersonaSearchFields } from './search/fields/personaSearchFields';

/** Aplica búsqueda a una lista de personas */
export const applySearch = (personas, searchText) => {
  return applySearchCore(personas, searchText, getPersonaSearchFields);
};
