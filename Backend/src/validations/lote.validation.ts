import { z } from 'zod';

// **Schemas de validacion para Lote**

// Para crear un nuevo Lote
export const createLoteSchema = z.object({
  fraccion: z.coerce.number().int('La fracción debe ser un número entero').positive('La fracción debe ser positiva'),
  numPartido: z.coerce.number().int().default(62),
  frente: z.coerce.number().min(0, 'El frente no puede ser negativo').optional(),
  fondo: z.coerce.number().min(0, 'El fondo no puede ser negativo').optional(),
  superficie: z.coerce.number().min(0, 'La superficie no puede ser negativa').optional(),
  estado: z.enum(['DISPONIBLE', 'RESERVADO', 'VENDIDO', 'NO_DISPONIBLE']),
  subestado: z.enum(['EN_CONSTRUCCION', 'NO_CONSTRUIDO', 'CONSTRUIDO']),
  tipoLote: z.enum(['LOTE_VENTA', 'ESPACIO_COMUN']), // Lote Venta o Espacio Común
  descripcion: z.string().optional(),
  propietarioId: z.coerce.number().int('El ID del propietario debe ser un número entero').positive('El ID del propietario debe ser positivo'),
  ubicacionId: z.coerce.number().int('El ID de la ubicación debe ser un número entero').positive('El ID de la ubicación debe ser positivo').optional(),
});

// Para actualizar un Lote (todos los campos son opcionales)
export const updateLoteSchema = createLoteSchema.partial();

// Para obtener un Lote por ID
export const getLoteSchema = z.object({
  id: z.coerce.number().int('El ID del lote debe ser un número entero').positive('El ID del lote debe ser positivo'),
});

// Para eliminar un Lote por ID (igual que obtener)
export const deleteLoteSchema = getLoteSchema;

// Para filtrar lotes por varios parámetros
export const queryLoteSchema = z.object({
  estado: z.enum(['DISPONIBLE', 'RESERVADO', 'VENDIDO', 'NO_DISPONIBLE']).optional(),
  tipoLote: z.enum(['LOTE_VENTA', 'ESPACIO_COMUN']).optional(),
  propietarioId: z.coerce.number().int('El ID del propietario debe ser un número entero').positive('El ID del propietario debe ser positivo').optional(),
  ubicacionId: z.coerce.number().int('El ID de la ubicación debe ser un número entero').positive('El ID de la ubicación debe ser positivo').optional(),
  fechaCreacionFrom: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de creación "from" inválida' }).optional(),
  fechaCreacionTo: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Fecha de creación "to" inválida' }).optional(),
  superficieMin: z.coerce.number().min(0, 'La superficie mínima no puede ser negativa').optional(),
  superficieMax: z.coerce.number().min(0, 'La superficie máxima no puede ser negativa').optional(),
});
