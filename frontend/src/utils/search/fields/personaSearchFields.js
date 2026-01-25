// ===================
// Campos buscables para Personas
// ===================
// Migrado desde personaSearch.js para usar el core común
// Mantiene exactamente los mismos campos que antes

/**
 * Extrae los campos buscables de una persona
 * Mantiene la misma lógica que tenía matchesSearch en personaSearch.js
 */
export const getPersonaSearchFields = (persona) => {
  if (!persona) return [];
  
  const fields = [];
  
  // DisplayName (razonSocial o nombre+apellido)
  const displayName = persona.razonSocial 
    ? persona.razonSocial 
    : `${persona.nombre || ''} ${persona.apellido || ''}`.trim();
  if (displayName) fields.push(displayName);
  
  // Campos individuales
  if (persona.nombre) fields.push(persona.nombre);
  if (persona.apellido) fields.push(persona.apellido);
  if (persona.razonSocial) fields.push(persona.razonSocial);
  
  // Contacto
  if (persona.email) fields.push(persona.email);
  if (persona.contacto) fields.push(persona.contacto);
  if (persona.telefono) fields.push(String(persona.telefono));
  
  // Identificador
  if (persona.identificadorValor) {
    fields.push(persona.identificadorValor);
  }
  if (persona.cuil) {
    fields.push(persona.cuil);
  }
  
  // Identificador formateado (ej: "DNI 12345678", "CUIL 20123456789")
  if (persona.identificadorTipo && persona.identificadorValor) {
    fields.push(`${persona.identificadorTipo} ${persona.identificadorValor}`);
  }
  
  return fields;
};
