import { z } from "zod";

/**
 * Helper para preprocesar números
 */
const preprocessNumber = (val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

export const inmobiliariaCreateSchema = z.object({
  nombre: z
    .string({ required_error: "El nombre es obligatorio" })
    .min(1, "El nombre es obligatorio")
    .max(100, "El nombre no puede exceder los 100 caracteres"),

  razonSocial: z
    .string({ required_error: "La razón social es obligatoria" })
    .min(1, "La razón social es obligatoria")
    .max(100, "La razón social no puede exceder los 100 caracteres"),

  contacto: z
    .string()
    .max(100, "El contacto no puede exceder los 100 caracteres")
    .optional()
    .nullable(), // Backend permits null

  comxventa: z
    .preprocess(
      preprocessNumber,
      z.union([
        z.number({ invalid_type_error: "Debe ser un número válido" })
         .min(0, "La comisión no puede ser negativa")
         .max(100, "La comisión no puede ser mayor al 100%"),
        z.undefined(),
      ])
    )
    .optional(),

  maxPrioridadesActivas: z
    .preprocess(
      preprocessNumber,
      z.union([
        z.number({ invalid_type_error: "Debe ser un número válido" })
         .int("Debe ser un número entero")
         .min(0, "No puede ser negativo"),
        z.undefined(),
      ])
    )
    .optional(),
});
