// src/validations/pago.validation.ts
import { z } from 'zod';

// Helpers reutilizables (mismo estilo que reserva.validation.ts)
const idInt = z.coerce.number().int('El id debe ser entero').positive('El id debe ser positivo');
const dineroPositivo = z.coerce.number().positive('El monto debe ser mayor a 0');
const dinero = z.coerce.number().min(0, 'El monto no puede ser negativo');

const isoDate = z
  .union([
    z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Fecha inválida'),
    z.date()
  ])
  .transform((v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString()));

// Enums válidos del submódulo Pagos
const tipoFinanciacionEnum = z.enum(['CONTADO', 'ANTICIPO_CUOTAS', 'CUOTAS_FIJAS', 'PERSONALIZADO']);
const monedaEnum = z.enum(['ARS', 'USD']);
const tipoCuotaEnum = z.enum(['ANTICIPO', 'CUOTA', 'OTRO']);

// Params: ventaId
export const ventaIdParamSchema = z.object({
  ventaId: idInt,
});

// Cuota dentro del body de creación de plan
const cuotaInputSchema = z.object({
  numeroCuota: z.coerce.number().int('El número de cuota debe ser entero').positive('El número de cuota debe ser positivo'),
  tipoCuota: tipoCuotaEnum,
  fechaVencimiento: isoDate,
  montoOriginal: dineroPositivo,
  descripcion: z.string().trim().optional(),
});

// Body: crear plan de pago inicial
export const createPlanPagoSchema = z.object({
  nombre: z.string().min(1, 'El nombre del plan es obligatorio').max(100, 'El nombre del plan es demasiado largo').trim(),
  tipoFinanciacion: tipoFinanciacionEnum,
  moneda: monedaEnum,
  cantidadCuotas: z.coerce.number().int('La cantidad de cuotas debe ser un entero').positive('La cantidad de cuotas debe ser positiva'),
  montoTotalPlanificado: dineroPositivo,
  fechaInicio: isoDate,
  cuotas: z.array(cuotaInputSchema).min(1, 'Debe incluir al menos una cuota'),
  descripcion: z.string().trim().optional(),
  montoAnticipo: dinero.optional(),
  observaciones: z.string().trim().optional(),
}).refine((data) => {
  const anticipo = data.montoAnticipo ?? 0;
  return data.montoTotalPlanificado >= anticipo;
}, {
  message: 'El monto total planificado debe ser mayor o igual al anticipo',
  path: ['montoAnticipo'],
}).refine((data) => {
  return data.cantidadCuotas === data.cuotas.length;
}, {
  message: 'La cantidad de cuotas debe coincidir con el número de cuotas enviadas',
  path: ['cantidadCuotas'],
}).refine((data) => {
  const numeros = data.cuotas.map((c) => c.numeroCuota);
  return new Set(numeros).size === numeros.length;
}, {
  message: 'No se permiten números de cuota repetidos',
  path: ['cuotas'],
});
