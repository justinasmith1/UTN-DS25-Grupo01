// ===================
// Campos buscables para Ventas
// ===================

import { buildLoteSearchVariants } from '../loteFormat';

/**
 * Extrae los campos buscables de una venta.
 * Etapa 4: itera sobre compradores[] (múltiples) con fallback a comprador (único, legacy).
 * Campos verificados según includes del backend en venta.service.ts.
 */
export const getVentaSearchFields = (venta) => {
  if (!venta) return [];
  
  const fields = [];
  
  // Número de venta
  if (venta.numero) fields.push(String(venta.numero));
  
  // ID (para búsqueda directa)
  if (venta.id != null) fields.push(String(venta.id));
  
  // Etapa 4: compradores múltiples — iterar sobre compradores[] con fallback a comprador legacy
  const listaCompradores = venta.compradores?.length
    ? venta.compradores
    : (venta.comprador ? [venta.comprador] : []);

  listaCompradores.forEach(comp => {
    if (!comp) return;
    if (comp.nombre) fields.push(comp.nombre);
    if (comp.apellido) fields.push(comp.apellido);
    if (comp.razonSocial) fields.push(comp.razonSocial);
    
    const nombreCompleto = [comp.nombre, comp.apellido].filter(Boolean).join(' ');
    if (nombreCompleto) fields.push(nombreCompleto);
    
    if (comp.identificadorValor) {
      fields.push(comp.identificadorValor);
      if (comp.identificadorTipo) {
        fields.push(`${comp.identificadorTipo} ${comp.identificadorValor}`);
      }
    }
  });
  
  // Lote asociado
  if (venta.lote) {
    fields.push(...buildLoteSearchVariants(venta.lote));
    
    // Propietario del lote
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
