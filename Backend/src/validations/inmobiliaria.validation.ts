import {z} from 'zod';

export const createInmobiliariaSchema = z.object({
    nombre: z.string().min(1, 'Se requiere un nombre').max(100, 'El nombre es demasiado largo').trim(),
    razonSocial: z.string().min(1, 'Se requiere una razón social').max(150, 'La razón social es demasiado larga').trim(),
    contacto: z.string().max(100, 'El contacto es demasiado largo').optional(),
    comxventa: z.number().min(0, 'La comisión por venta no puede ser negativa').max(100, 'La comisión por venta no puede ser mayor a 100').optional(),
    userId: z.number().int('El ID del usuario debe ser un número entero').positive('El ID del usuario debe ser un número positivo').optional(),
})

export const updateInmobiliariaSchema = createInmobiliariaSchema.partial();

export const updateInmobiliariaWithParamsSchema = z.object({
    idInmobiliaria: z.coerce.number().int('El ID de la inmobiliaria debe ser un número entero').positive('El ID de la inmobiliaria debe ser un número positivo'),
}).merge(updateInmobiliariaSchema);

export const getInmobiliariaSchema = z.object({
    id: z.coerce.number().int('El ID de la inmobiliaria debe ser un número entero').positive('El ID de la inmobiliaria debe ser un número positivo'),
}); 

export const deleteInmobiliariaSchema = getInmobiliariaSchema;

export const queryInmobiliariaSchema = z.object({
    nombre: z.string().min(1, 'Se requiere un nombre').max(100, 'El nombre es demasiado largo').trim().optional(),
    razonSocial: z.string().min(1, 'Se requiere una razón social').max(150, 'La razón social es demasiado larga').trim().optional(),
    contacto: z.string().max(100, 'El contacto es demasiado largo').optional(),
    comxventa: z.number().min(0, 'La comisión por venta no puede ser negativa').max(100, 'La comisión por venta no puede ser mayor a 100').optional(),
    userId: z.number().int('El ID del usuario debe ser un número entero').positive('El ID del usuario debe ser un número positivo').optional(),
});
