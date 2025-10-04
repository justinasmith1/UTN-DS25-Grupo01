import { z } from "zod";

const calleEnum = z.enum([
  'Reinamora',
  'Maca',
  'Zorzal',
  'Cauquén',
  'Alondra',
  'Jacana',
  'Tacuarito',
  'Jilguero',
  'Golondrina',
  'Calandria',
  'Aguilamora',
  'Lorca',
  'Milano',
]);

export const createUbicacionSchema = z.object({
  calle: calleEnum,
  numero: z.string().min(1, "El número de ubicación es requerido").max(50, "El número de ubicación no puede tener más de 50 caracteres"),
});

export const updateUbicacionSchema = z.object({
  calle: calleEnum.optional(),
  numero: z.string().min(1, "El número de ubicación es requerido").max(50, "El número de ubicación no puede tener más de 50 caracteres").optional(),
});

export const getUbicacionSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID debe ser un número').transform(Number),
});

export const deleteUbicacionSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID debe ser un número').transform(Number),
});

