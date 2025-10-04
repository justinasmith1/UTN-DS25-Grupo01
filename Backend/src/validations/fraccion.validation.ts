import { z } from "zod";

export const createFraccionSchema = z.object({
    numero: z.string().min(1, "El número de fracción es requerido").max(50, "El número de fracción no puede tener más de 50 caracteres")
});

export const updateFraccionSchema = z.object({
    numero: z.string().min(1, "El número de fracción es requerido").max(50, "El número de fracción no puede tener más de 50 caracteres").optional()
});

export const getFraccionSchema = z.object({
    id: z.string().regex(/^\d+$/, "ID debe ser un número").transform(Number)
});

export const deleteFraccionSchema = z.object({
    id: z.string().regex(/^\d+$/, "ID debe ser un número").transform(Number)
});