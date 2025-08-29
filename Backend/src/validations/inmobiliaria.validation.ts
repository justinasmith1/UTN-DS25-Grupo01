import {z} from 'zod';

export const createInmbSchema = z.object({
    nombre: z.string().min(1, 'Se requiere un nombre').max(100, 'El nombre es demasiado largo').trim(),
    razonSocial: z.string().min(1, 'Se requiere una razón social').max(150, 'La razón social es demasiado larga').trim(),
    contacto: z.string().max(100, 'El contacto es demasiado largo').optional(),
    comxventa: z.number().min(0, 'La comisión por venta no puede ser negativa').max(100, 'La comisión por venta no puede ser mayor a 100').optional(),
    userId: z.number().int('El ID del usuario debe ser un número entero').positive('El ID del usuario debe ser un número positivo').optional(),
})

export const updateInmbSchema = createInmbSchema.partial();