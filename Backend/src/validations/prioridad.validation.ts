// src/validations/prioridad.validation.ts
import { z } from 'zod';

// Helpers reutilizables
const idInt = z.coerce.number().int('El id debe ser entero').positive('El id debe ser positivo');

// Acepto que venga tipo Date o string y lo normalizo a ISO
const isoDate = z
  .union([
    z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha inválida'),
    z.date()
  ])
  .transform((v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString()));

// ==============================
// Body: crear prioridad
// ==============================
export const createPrioridadSchema = z.object({
  loteId: idInt,
  fechaFin: isoDate.refine(
    (dateStr) => {
      const date = new Date(dateStr);
      const now = new Date();
      return date > now;
    },
    { message: 'La fecha de fin debe ser posterior a la fecha actual' }
  ),
});

// ==============================
// Parámetros comunes (/:id)
// ==============================
export const getPrioridadParamsSchema = z.object({
  id: idInt,
});

// ==============================
// Query del listado (GET /prioridades)
// ==============================
export const queryPrioridadesSchema = z.object({
  estado: z.enum(['ACTIVA', 'CANCELADA', 'FINALIZADA', 'EXPIRADA']).optional(),
  ownerType: z.enum(['INMOBILIARIA', 'CCLF']).optional(),
  inmobiliariaId: idInt.optional(),
  loteId: idInt.optional(),
  fechaInicioDesde: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha "desde" inválida').optional(),
  fechaInicioHasta: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha "hasta" inválida').optional(),
  fechaFinDesde: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha de fin "desde" inválida').optional(),
  fechaFinHasta: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha de fin "hasta" inválida').optional(),
}).refine((q) => {
  if (q.fechaInicioDesde && q.fechaInicioHasta) {
    return new Date(q.fechaInicioDesde) <= new Date(q.fechaInicioHasta);
  }
  return true;
}, {
  message: 'El rango de fechas de inicio es inválido (desde > hasta)',
  path: ['fechaInicioHasta'],
}).refine((q) => {
  if (q.fechaFinDesde && q.fechaFinHasta) {
    return new Date(q.fechaFinDesde) <= new Date(q.fechaFinHasta);
  }
  return true;
}, {
  message: 'El rango de fechas de fin es inválido (desde > hasta)',
  path: ['fechaFinHasta'],
});
