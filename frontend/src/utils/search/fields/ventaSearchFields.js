// ===================
// Campos buscables para Ventas
// ===================

import { buildLoteSearchVariants } from '../loteFormat';

/**
 * Extrae los campos buscables de una venta
 * Campos verificados según includes del backend en venta.service.ts
 * Nota: venta.comprador y venta.lote.propietario vienen completos (sin select específico)
 */
export const getVentaSearchFields = (venta) => {
  if (!venta) return [];
  
  const fields = [];
  
  // Número de venta
  if (venta.numero) fields.push(String(venta.numero));
  
  // ID (para búsqueda directa)
  if (venta.id != null) fields.push(String(venta.id));
  
  // Comprador (Persona completa)
  if (venta.comprador) {
    const comp = venta.comprador;
    if (comp.nombre) fields.push(comp.nombre);
    if (comp.apellido) fields.push(comp.apellido);
    if (comp.razonSocial) fields.push(comp.razonSocial);
    
    // Nombre completo
    const nombreCompleto = [comp.nombre, comp.apellido].filter(Boolean).join(' ');
    if (nombreCompleto) fields.push(nombreCompleto);
    
    // Identificador (si existe)
    if (comp.identificadorValor) {
      fields.push(comp.identificadorValor);
      if (comp.identificadorTipo) {
        fields.push(`${comp.identificadorTipo} ${comp.identificadorValor}`);
      }
    }
  }
  
  // Lote asociado (variantes del ID estandarizado si existen fraccion/numero)
  if (venta.lote) {
    fields.push(...buildLoteSearchVariants(venta.lote));
    
    // Propietario del lote (Persona completa)
    if (venta.lote.propietario) {
      const prop = venta.lote.propietario;
      if (prop.nombre) fields.push(prop.nombre);
      if (prop.apellido) fields.push(prop.apellido);
      if (prop.razonSocial) fields.push(prop.razonSocial);
      
      const propNombreCompleto = [prop.nombre, prop.apellido].filter(Boolean).join(' ');
      if (propNombreCompleto) fields.push(propNombreCompleto);
    }
  }
  
  return fields;
};
