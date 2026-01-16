// ===================
// Helper común para formatear Lote ID estandarizado y variantes buscables
// Usado por búsqueda en Lotes, Ventas, Reservas
// ===================

/**
 * Construye todas las variantes buscables del ID de un lote
 * Incluye formatos para permitir búsquedas parciales como "Lote 3-" o "3-"
 * @param {object} lote - Objeto lote
 * @returns {string[]} - Array de variantes buscables
 */
export const buildLoteSearchVariants = (lote) => {
  if (!lote) return [];
  
  const fields = [];
  const fraccion = lote?.fraccion?.numero;
  const numero = lote?.numero;
  
  // Si tenemos fraccion y numero, construir variantes completas
  if (fraccion != null && numero != null) {
    // Formato estándar completo
    fields.push(`Lote ${fraccion}-${numero}`);
    
    // Formato sin guión (espacio)
    fields.push(`Lote ${fraccion} ${numero}`);
    
    // Formato parcial "Lote {fraccion}-" para encontrar todos los lotes de una fracción
    fields.push(`Lote ${fraccion}-`);
    
    // Formato sin "Lote" y con guión
    fields.push(`${fraccion}-${numero}`);
    
    // Formato parcial sin "Lote" para "3-"
    fields.push(`${fraccion}-`);
    
    // Variantes individuales
    fields.push(`Fraccion ${fraccion}`);
    fields.push(`Parcela ${numero}`);
    
    // Campos individuales (para búsquedas directas)
    fields.push(String(fraccion));
    fields.push(String(numero));
  }
  
  // MapId e ID siempre (incluidos tanto si hay fraccion/numero como si no)
  if (lote?.mapId) fields.push(String(lote.mapId));
  if (lote?.id != null) fields.push(String(lote.id));
  
  return fields;
};
