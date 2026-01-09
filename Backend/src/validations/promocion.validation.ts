import { z } from 'zod';

// Schema para aplicar promoción
export const aplicarPromocionSchema = z.object({
  precioPromocional: z.coerce.number()
    .positive('El precio promocional debe ser positivo')
    .min(0.01, 'El precio promocional debe ser mayor a cero'),
  fin: z
    .union([
      z.string().transform((val) => {
        if (!val || val.trim() === '') return null;
        const parsed = new Date(val);
        return isNaN(parsed.getTime()) ? null : parsed;
      }),
      z.date(),
      z.null(),
      z.undefined(),
    ])
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val === null || val === undefined) return true;
      if (val instanceof Date) {
        return val > new Date();
      }
      return false;
    }, { message: 'La fecha de fin debe ser una fecha válida en el futuro' }),
  explicacion: z
    .union([z.string(), z.null(), z.undefined(), z.literal('')])
    .optional()
    .nullable()
    .refine((val) => {
      if (!val || val === null || val === undefined || val === '') return true;
      return typeof val === 'string' && val.length <= 500;
    }, { message: 'La explicación no puede tener más de 500 caracteres' }),
});

// Schema para quitar promoción (sin body, solo params)
export const quitarPromocionSchema = z.object({
  id: z.coerce.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser positivo'),
});

// Schema para obtener promoción activa
export const getPromocionActivaSchema = z.object({
  id: z.coerce.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser positivo'),
});








