// ===================
// Campos buscables para Prioridades
// ===================

import { buildLoteSearchVariants } from '../loteFormat';

/** Extrae los campos buscables de una prioridad */
export const getPrioridadSearchFields = (prioridad) => {
  if (!prioridad) return [];
  
  const fields = [];
  
  // N° prioridad 
  if (prioridad.id != null) {
    fields.push(String(prioridad.id));
    if (prioridad.numero) {
      fields.push(String(prioridad.numero));
    } else {
      // Formateo tipico
      const formatted = `PRI-${String(prioridad.id).padStart(6, '0')}`;
      fields.push(formatted);
    }
  }
  
  // Estado
  if (prioridad.estado) {
    fields.push(String(prioridad.estado).toLowerCase());
    fields.push(String(prioridad.estado));
  }
  
  // Owner
  if (prioridad.ownerType === 'CCLF') {
    fields.push('la federala');
    fields.push('cclf');
  } else if (prioridad.inmobiliaria) {
    const inm = prioridad.inmobiliaria;
    if (inm.nombre) fields.push(String(inm.nombre));
    if (inm.razonSocial) fields.push(String(inm.razonSocial));
  } else if (prioridad.inmobiliariaNombre) {
    fields.push(String(prioridad.inmobiliariaNombre));
  }
  
  // Lote asociado (usando helper común)
  if (prioridad.lote) {
    fields.push(...buildLoteSearchVariants(prioridad.lote));
  }
  
  return fields;
};
