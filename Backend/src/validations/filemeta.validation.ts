import { z } from 'zod';
import id from 'zod/v4/locales/id.js';

export const fileMetadataSchema = z.object({
    filename: z.string().min(1, "El nombre del archivo es obligatorio"),
    url: z.string().url("La URL debe ser válida"),
    idLoteAsociado: z.number().int().positive("El ID del lote asociado debe ser un número entero positivo"),
    uploadedBy: z.string().nullable(),
    uplodedAt: z.date().default(() => new Date())
});

export const createFileMetadataSchema = z.object({
    idLoteAsociado: z.preprocess((val) => Number(val), z.number().int().positive()),
    tipo: z.enum(['BOLETO', 'ESCRITURA', 'PLANO', 'IMAGEN']),
});

export const updateFileMetadataSchema = z.object({
    filename: z.string().min(1, "El nombre del archivo es obligatorio").optional(),
    url: z.string().url("La URL debe ser válida").optional(),   
    idLoteAsociado: z.number().int().positive("El ID del lote asociado debe ser un número entero positivo").optional(),
    uploadedBy: z.string().nullable().optional(),
    uplodedAt: z.date().optional()
});

export const deleteFileMetadataSchema = z.object({
    id: z.number().int().positive("El ID del archivo debe ser un número entero positivo")
});

