// src/validations/reserva.validation.ts
import { z } from 'zod';
/* 
  Helpers reutilizables
  ------------------------
  - No son obligatorios, pero mas adelante queremos hacer algunos cambios o agregar cosas que utilicen las mismas
    validaciones, lo mejor seria que esten.

  - Uso z.coerce.number() para que se banque numeros que llegan como "string". Si ya me llega number en JSON, igual funciona.
*/

const idInt = z.coerce.number().int('El id debe ser entero').positive('El id debe ser positivo');

const dinero = z.coerce.number().min(0, 'El monto no puede ser negativo'); // para que la seña sea mayor a 0

// Acepto que venga tipo Date o string y lo normalizo a ISO que es la forma estandarizada .
const isoDate = z
  .union([
    z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha inválida'),
    z.date()
  ])
  .transform((v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString()));


/* Body: crear reserva
  ----------------------
  - Campos obligatorios: fechaReserva, loteId, clienteId.
  - inmobiliariaId y seña: opcionales.
*/
export const createReservaSchema = z.object({
  fechaReserva: isoDate,                 
  loteId: idInt,                         // FK obligatoria
  clienteId: idInt,                      // FK obligatoria
  inmobiliariaId: idInt.optional().nullable(), // FK opcional (nullable por si lo vendio el club de campo y ninguna inm en el medio")
  sena: dinero.optional(),               
}).strict(); // rechaza campos adicionales que por ahi se manden


/* Body: actualizar (PUT)
  -------------------------
  - Es parcial (no obligo a mandar todo).
  - PERO no permito body vacío: si viene {}, corto con 400.
*/
export const updateReservaSchema = createReservaSchema
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

/*  Parametros comunes (/:idReserva)
  -------------------------------
  - GET detalle, PUT, DELETE usan el mismo parametros q es el idReserva.
*/
export const getReservaParamsSchema = z.object({
  id: idInt,
});

/*  Parametros para eliminar, usa el mismo que el de arriba del obtener */
export const deleteReservaParamsSchema = getReservaParamsSchema;

/*  Query del listado (GET /reservas) */
export const queryReservasSchema = z.object({
  desde: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha "desde" inválida').optional(),
  hasta: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha "hasta" inválida').optional(),
  loteId: idInt.optional(),
  clienteId: idInt.optional(),
  inmobiliariaId: idInt.optional(),
  sena: dinero.optional(), 
}).refine((q) => {
  if (q.desde && q.hasta) return new Date(q.desde) <= new Date(q.hasta);
  return true;
}, {
  message: 'El rango de fechas es inválido (desde > hasta)',
  path: ['hasta'],
});
