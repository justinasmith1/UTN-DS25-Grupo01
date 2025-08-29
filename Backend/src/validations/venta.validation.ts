import { z } from 'zod';

export const createVentaSchema = z.object({
    loteId: z.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser un número positivo'),
    fechaVenta: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de venta inválida' }),
    monto: z.number().min(0, 'El monto no puede ser negativo'),
    estado: z.enum(['INICIADA', 'CON_BOLETO', 'ESCRITURA_PROGRAMADA', 'ESCRITURADO']).optional(),
    plazoEscritura: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de plazo de escritura inválida' }).optional(),
    tipoPago: z.string().min(1, 'Se requiere un tipo de pago').trim(),
    compradorId: z.number().int('El ID del comprador debe ser un número entero').positive('El ID del comprador debe ser un número positivo'),
    inmobiliariaId: z.number().int('El ID de la inmobiliaria debe ser un número entero').positive('El ID de la inmobiliaria debe ser un número positivo').optional(),
});

export const updateVentaSchema = createVentaSchema.partial();

export const getVentaSchema = z.object({
    id: z.number().int('El ID de la venta debe ser un número entero').positive('El ID de la venta debe ser un número positivo'),
});

export const deleteVentaSchema = getVentaSchema;

export const queryVentaSchema = z.object({
    estado: z.enum(['INICIADA', 'CON_BOLETO', 'ESCRITURA_PROGRAMADA', 'ESCRITURADO']).optional(),
    compradorId: z.number().int('El ID del comprador debe ser un número entero').positive('El ID del comprador debe ser un número positivo').optional(),
    vendedorId: z.number().int('El ID del vendedor debe ser un número entero').positive('El ID del vendedor debe ser un número positivo').optional(),
    loteId: z.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser un número positivo').optional(),
    fechaVentaFrom: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de venta "from" inválida' }).optional(),
    fechaVentaTo: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de venta "to" inválida' }).optional(),
    montoMin: z.number().min(0, 'El monto mínimo no puede ser negativo').optional(),
    montoMax: z.number().min(0, 'El monto máximo no puede ser negativo').optional(),
})
