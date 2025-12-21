import { z } from 'zod';

export const createVentaSchema = z.object({
    loteId: z.coerce.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser un número positivo'),
    fechaVenta: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de venta inválida' }),
    monto: z.coerce.number().min(0, 'El monto no puede ser negativo'),
    estado: z.enum(['INICIADA', 'CON_BOLETO', 'ESCRITURA_PROGRAMADA', 'ESCRITURADO', 'CANCELADA']).optional(),
    estadoCobro: z.enum(['PENDIENTE', 'EN_CURSO', 'COMPLETADA']).optional(),
    plazoEscritura: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de plazo de escritura inválida' }).optional(),
    tipoPago: z.string().min(1, 'Se requiere un tipo de pago').trim(),
    compradorId: z.coerce.number().int('El ID del comprador debe ser un número entero').positive('El ID del comprador debe ser un número positivo'),
    inmobiliariaId: z.coerce.number().int('El ID de la inmobiliaria debe ser un número entero').positive('El ID de la inmobiliaria debe ser un número positivo').optional(),
    reservaId: z.number().int('El ID de la reserva debe ser un número entero').positive('El ID de la reserva debe ser un número positivo').optional().nullable(),
    numero: z.string().min(3, 'El número de venta es obligatorio').max(30, 'El número de venta es demasiado largo').trim(),
});

export const updateVentaSchema = createVentaSchema.partial();

// z.coerce.number() convierte el string del param a number antes de validar.
export const getVentaSchema = z.object({
    id: z.coerce.number().int('El ID de la venta debe ser un número entero').positive('El ID de la venta debe ser un número positivo'),
});

export const deleteVentaSchema = getVentaSchema;

export const queryVentaSchema = z.object({
    estado: z.enum(['INICIADA', 'CON_BOLETO', 'ESCRITURA_PROGRAMADA', 'ESCRITURADO', 'CANCELADA']).optional(),
    compradorId: z.coerce.number().int('El ID del comprador debe ser un número entero').positive('El ID del comprador debe ser un número positivo').optional(),
    vendedorId: z.coerce.number().int('El ID del vendedor debe ser un número entero').positive('El ID del vendedor debe ser un número positivo').optional(),
    loteId: z.coerce.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser un número positivo').optional(),
    fechaVentaFrom: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de venta "from" inválida' }).optional(),
    fechaVentaTo: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de venta "to" inválida' }).optional(),
    montoMin: z.coerce.number().min(0, 'El monto mínimo no puede ser negativo').optional(),
    montoMax: z.coerce.number().min(0, 'El monto máximo no puede ser negativo').optional(),
})
