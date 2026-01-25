// ===================
// Campos buscables para Reservas
// ===================

import { buildLoteSearchVariants } from '../loteFormat';

/**
 * Extrae los campos buscables de una reserva
 * Campos verificados según includes del backend en reserva.service.ts
 * Nota: reserva.lote NO incluye fraccion/numero en el include actual,
 *       entonces buildLoteSearchVariants cae al fallback (mapId/id).
 *       Para soportar búsqueda por "Lote {fraccion}-{numero}" en Reservas,
 *       ampliar el include backend para traer fraccion.numero y numero.
 */
export const getReservaSearchFields = (reserva) => {
  if (!reserva) return [];
  
  const fields = [];
  
  // Número de reserva
  if (reserva.numero) fields.push(String(reserva.numero));
  
  // ID (para búsqueda directa)
  if (reserva.id != null) fields.push(String(reserva.id));
  
  // Cliente (Persona)
  if (reserva.cliente) {
    const cliente = reserva.cliente;
    if (cliente.nombre) fields.push(cliente.nombre);
    if (cliente.apellido) fields.push(cliente.apellido);
    
    // Nombre completo
    const nombreCompleto = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ');
    if (nombreCompleto) fields.push(nombreCompleto);
  }
  
  // Lote asociado (usando helper común, que cae a fallback mapId/id si no hay fraccion/numero)
  if (reserva.lote) {
    fields.push(...buildLoteSearchVariants(reserva.lote));
  }
  
  return fields;
};
