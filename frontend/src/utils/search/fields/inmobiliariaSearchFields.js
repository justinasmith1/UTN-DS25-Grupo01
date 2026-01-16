// ===================
// Campos buscables para Inmobiliarias
// ===================

/**
 * Extrae los campos buscables de una inmobiliaria
 * Campos verificados según schema y servicios
 */
export const getInmobiliariaSearchFields = (inmobiliaria) => {
  if (!inmobiliaria) return [];
  
  const fields = [];
  
  // Nombre
  if (inmobiliaria.nombre) fields.push(inmobiliaria.nombre);
  
  // Razón social
  if (inmobiliaria.razonSocial) fields.push(inmobiliaria.razonSocial);
  
  // ID (para búsqueda directa)
  if (inmobiliaria.id != null) fields.push(String(inmobiliaria.id));
  
  // ID alternativo (si viene como idInmobiliaria)
  if (inmobiliaria.idInmobiliaria != null) fields.push(String(inmobiliaria.idInmobiliaria));
  
  return fields;
};
