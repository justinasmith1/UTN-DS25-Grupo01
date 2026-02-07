import { z } from 'zod';

// Schemas base reutilizables
const estadoVentaEnum = z.enum(['INICIADA', 'CON_BOLETO', 'ESCRITURADO', 'CANCELADA']);
const estadoCobroEnum = z.enum(['PENDIENTE', 'EN_CURSO', 'PAGO_COMPLETO']);
const estadoOperativoEnum = z.enum(['OPERATIVO', 'ELIMINADO']);

const fechaISO = z.string().refine((date) => !isNaN(Date.parse(date)), { 
    message: 'Fecha inválida' 
});

export const createVentaSchema = z.object({
    loteId: z.coerce.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser un número positivo'),
    fechaVenta: fechaISO,
    monto: z.coerce.number().min(0, 'El monto no puede ser negativo'),
    estado: estadoVentaEnum.optional(),
    estadoCobro: estadoCobroEnum.optional(),
    plazoEscritura: fechaISO.optional(),
    fechaEscrituraReal: fechaISO.optional(),
    fechaCancelacion: fechaISO.optional(),
    motivoCancelacion: z.string().min(1, 'El motivo de cancelación no puede estar vacío').trim().optional(),
    tipoPago: z.string().min(1, 'Se requiere un tipo de pago').trim(),
    compradorId: z.coerce.number().int('El ID del comprador debe ser un número entero').positive('El ID del comprador debe ser un número positivo'),
    inmobiliariaId: z.coerce.number().int('El ID de la inmobiliaria debe ser un número entero').positive('El ID de la inmobiliaria debe ser un número positivo').optional(),
    reservaId: z.number().int('El ID de la reserva debe ser un número entero').positive('El ID de la reserva debe ser un número positivo').optional().nullable(),
    numero: z.string().min(3, 'El número de venta es obligatorio').max(30, 'El número de venta es demasiado largo').trim(),
}).refine((data) => {
    // Si estado es ESCRITURADO, fechaEscrituraReal es obligatoria
    if (data.estado === 'ESCRITURADO' && !data.fechaEscrituraReal) {
        return false;
    }
    return true;
}, {
    message: 'El campo fechaEscrituraReal es obligatorio para el estado ESCRITURADO',
    path: ['fechaEscrituraReal'],
}).refine((data) => {
    // Si estado es CANCELADA, fechaCancelacion es obligatoria
    if (data.estado === 'CANCELADA' && !data.fechaCancelacion) {
        return false;
    }
    return true;
}, {
    message: 'El campo fechaCancelacion es obligatorio para el estado CANCELADA',
    path: ['fechaCancelacion'],
}).refine((data) => {
    // Si estado es CANCELADA, motivoCancelacion es obligatorio
    if (data.estado === 'CANCELADA' && !data.motivoCancelacion) {
        return false;
    }
    return true;
}, {
    message: 'El campo motivoCancelacion es obligatorio para el estado CANCELADA',
    path: ['motivoCancelacion'],
});

export const updateVentaSchema = z.object({
    loteId: z.coerce.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser un número positivo').optional(),
    fechaVenta: fechaISO.optional(),
    monto: z.coerce.number().min(0, 'El monto no puede ser negativo').optional(),
    estado: estadoVentaEnum.optional(),
    estadoCobro: estadoCobroEnum.optional(),
    plazoEscritura: fechaISO.optional(),
    fechaEscrituraReal: fechaISO.optional(),
    fechaCancelacion: fechaISO.optional(),
    motivoCancelacion: z.string().min(1, 'El motivo de cancelación no puede estar vacío').trim().optional(),
    tipoPago: z.string().min(1, 'Se requiere un tipo de pago').trim().optional(),
    compradorId: z.coerce.number().int('El ID del comprador debe ser un número entero').positive('El ID del comprador debe ser un número positivo').optional(),
    inmobiliariaId: z.coerce.number().int('El ID de la inmobiliaria debe ser un número entero').positive('El ID de la inmobiliaria debe ser un número positivo').optional(),
    numero: z.string().min(3, 'El número de venta es obligatorio').max(30, 'El número de venta es demasiado largo').trim().optional(),
}).refine((data) => {
    // Si estado es ESCRITURADO, fechaEscrituraReal es obligatoria
    if (data.estado === 'ESCRITURADO' && !data.fechaEscrituraReal) {
        return false;
    }
    return true;
}, {
    message: 'El campo fechaEscrituraReal es obligatorio para el estado ESCRITURADO',
    path: ['fechaEscrituraReal'],
}).refine((data) => {
    // Si estado es CANCELADA, fechaCancelacion es obligatoria
    if (data.estado === 'CANCELADA' && !data.fechaCancelacion) {
        return false;
    }
    return true;
}, {
    message: 'El campo fechaCancelacion es obligatorio para el estado CANCELADA',
    path: ['fechaCancelacion'],
}).refine((data) => {
    // Si estado es CANCELADA, motivoCancelacion es obligatorio
    if (data.estado === 'CANCELADA' && !data.motivoCancelacion) {
        return false;
    }
    return true;
}, {
    message: 'El campo motivoCancelacion es obligatorio para el estado CANCELADA',
    path: ['motivoCancelacion'],
});

// z.coerce.number() convierte el string del param a number antes de validar.
export const getVentaSchema = z.object({
    id: z.coerce.number().int('El ID de la venta debe ser un número entero').positive('El ID de la venta debe ser un número positivo'),
});

export const deleteVentaSchema = getVentaSchema;
export const patchVentaParamsSchema = getVentaSchema;

export const queryVentaSchema = z.object({
    estado: estadoVentaEnum.optional(),
    estadoOperativo: estadoOperativoEnum.optional(),
    compradorId: z.coerce.number().int('El ID del comprador debe ser un número entero').positive('El ID del comprador debe ser un número positivo').optional(),
    vendedorId: z.coerce.number().int('El ID del vendedor debe ser un número entero').positive('El ID del vendedor debe ser un número positivo').optional(),
    loteId: z.coerce.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser un número positivo').optional(),
    fechaVentaFrom: fechaISO.optional(),
    fechaVentaTo: fechaISO.optional(),
    montoMin: z.coerce.number().min(0, 'El monto mínimo no puede ser negativo').optional(),
    montoMax: z.coerce.number().min(0, 'El monto máximo no puede ser negativo').optional(),
})
