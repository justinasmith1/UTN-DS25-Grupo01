import { z } from "zod";

/**
 * Helper para preprocesar números: convierte "" o NaN a undefined
 */
const preprocessNumber = (val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

/**
 * Schema de validación para aplicar promoción usando Zod
 */
export const aplicarPromocionSchema = z.object({
  precioPromocional: z
    .preprocess(
      preprocessNumber,
      z.union([
        z.number({
          invalid_type_error: "El precio promocional debe ser un número válido",
        })
          .positive("El precio promocional debe ser mayor a cero")
          .min(0.01, "El precio promocional debe ser mayor a cero"),
        z.undefined(),
      ])
    )
    .refine((val) => val !== undefined, {
      message: "Debe ingresar un precio promocional",
    }),
  
  fin: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === "") return true; // Opcional
      const parsed = new Date(val);
      return !isNaN(parsed.getTime()) && parsed > new Date();
    }, {
      message: "La fecha de fin debe ser una fecha válida en el futuro",
    })
    .transform((val) => {
      if (!val || val.trim() === "") return undefined;
      return val;
    }),
  
  explicacion: z
    .string()
    .max(500, "La explicación no puede tener más de 500 caracteres")
    .optional()
    .transform((val) => val?.trim() || undefined),
  
  sinFechaFin: z.boolean().optional(), // Toggle para "sin fecha de fin"
});








