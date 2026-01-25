// ===================
// Campos buscables para Lotes
// ===================

import { buildLoteSearchVariants } from '../loteFormat';

/**
 * Extrae los campos buscables de un lote
 * Campos verificados según includes del backend en lote.service.ts
 */
export const getLoteSearchFields = (lote) => {
  if (!lote) return [];
  
  const fields = [];
  
  // Variantes del ID de lote estandarizado (incluye "Lote 3-", "3-", etc.)
  fields.push(...buildLoteSearchVariants(lote));
  
  // Propietario (Persona)
  if (lote?.propietario) {
    const prop = lote.propietario;
    if (prop.nombre) fields.push(prop.nombre);
    if (prop.apellido) fields.push(prop.apellido);
    if (prop.razonSocial) fields.push(prop.razonSocial);
    
    // Nombre completo (nombre + apellido)
    const nombreCompleto = [prop.nombre, prop.apellido].filter(Boolean).join(' ');
    if (nombreCompleto) fields.push(nombreCompleto);
    
    // Identificador
    if (prop.identificadorValor) {
      fields.push(prop.identificadorValor);
      // Formato "{tipo} {valor}" si hay tipo
      if (prop.identificadorTipo) {
        fields.push(`${prop.identificadorTipo} ${prop.identificadorValor}`);
      }
    }
  }
  
  // Inquilino activo (desde alquilerActivo)
  if (lote?.alquilerActivo?.inquilino) {
    const inqu = lote.alquilerActivo.inquilino;
    if (inqu.nombre) fields.push(inqu.nombre);
    if (inqu.apellido) fields.push(inqu.apellido);
    if (inqu.razonSocial) fields.push(inqu.razonSocial);
    const inquilinoCompleto = [inqu.nombre, inqu.apellido].filter(Boolean).join(' ');
    if (inquilinoCompleto) fields.push(inquilinoCompleto);
  }
  
  // Inquilino legacy (compatibilidad)
  if (lote?.inquilino) {
    const inqu = lote.inquilino;
    if (inqu.nombre) fields.push(inqu.nombre);
    if (inqu.apellido) fields.push(inqu.apellido);
    if (inqu.razonSocial) fields.push(inqu.razonSocial);
  }
  
  // Ubicación (verificar que existe en el objeto antes de usar)
  // Nota: Si se quiere ampliar búsqueda por calle/numero, verificar nombres exactos del objeto ubicacion
  if (lote?.ubicacion) {
    const ubi = lote.ubicacion;
    if (ubi.calle) fields.push(String(ubi.calle));
    if (ubi.numero != null) fields.push(String(ubi.numero));
    // String compuesto "calle numero" si ambos existen
    if (ubi.calle && ubi.numero != null) {
      fields.push(`${ubi.calle} ${ubi.numero}`);
    }
  }
  
  return fields;
};
