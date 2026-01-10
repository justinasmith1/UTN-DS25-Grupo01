import { z } from "zod";

/**
 * Rangos permitidos de parcelas por fracción
 * Formato: { fraccionNumero: { min, max } }
 */
export const FRACCION_RANGES = {
  3: { min: 1, max: 39 },
  4: { min: 1, max: 39 },
  6: { min: 1, max: 8 },
  7: { min: 1, max: 74 },
  8: { min: 1, max: 37 },
  11: { min: 1, max: 41 },
  14: { min: 1, max: 32 },
  15: { min: 1, max: 41 },
};

/**
 * Valida si un número de parcela está dentro del rango permitido para una fracción
 * @param {number} fraccionNumero - Número de la fracción (3, 4, 6, 7, 8, 11, 14, 15)
 * @param {number} numeroParcela - Número de la parcela
 * @returns {boolean} true si está en rango, false si no
 */
export function validateParcelaInRange(fraccionNumero, numeroParcela) {
  if (fraccionNumero == null || numeroParcela == null) return false;
  const range = FRACCION_RANGES[fraccionNumero];
  if (!range) return false; // Fracción no tiene rango definido
  return numeroParcela >= range.min && numeroParcela <= range.max;
}

/**
 * Helper para preprocesar números: convierte "" o NaN a undefined
 */
const preprocessNumber = (val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

/**
 * Schema de validación para crear un lote usando Zod
 */
export const loteCreateSchema = z
  .object({
    numero: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
            .int("El número de parcela debe ser un número entero")
            .positive("El número de parcela debe ser positivo"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "El número de parcela es obligatorio",
      }),
    
    numPartido: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
            .int("El número de partida debe ser un número entero")
            .positive("El número de partida debe ser positivo"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "El número de partida es obligatorio",
      })
      .default(62),
    
    tipo: z
      .string({
        required_error: "Seleccioná una opción",
        invalid_type_error: "Seleccioná una opción",
      })
      .refine((val) => val !== "" && val !== null && val !== undefined, {
        message: "Seleccioná una opción",
      })
      .refine((val) => ["Lote Venta", "Espacio Comun"].includes(val), {
        message: "Seleccioná una opción válida",
      }),
    
    estado: z
      .string({
        required_error: "Seleccioná una opción",
        invalid_type_error: "Seleccioná una opción",
      })
      .refine((val) => val !== "" && val !== null && val !== undefined, {
        message: "Seleccioná una opción",
      })
      .refine((val) => ["Disponible", "No Disponible", "Vendido"].includes(val), {
        message: "Seleccioná una opción válida",
      }),
    
    subestado: z
      .string({
        required_error: "Seleccioná una opción",
        invalid_type_error: "Seleccioná una opción",
      })
      .refine((val) => val !== "" && val !== null && val !== undefined, {
        message: "Seleccioná una opción",
      })
      .refine((val) => ["En Construccion", "No Construido", "Construido"].includes(val), {
        message: "Seleccioná una opción válida",
      }),
    
    fraccionId: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
            .int("La fracción debe ser un número entero")
            .positive("La fracción debe ser positiva"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "Seleccioná una opción",
      }),
    
    fraccionNumero: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
            .int("El número de fracción debe ser un número entero")
            .positive("El número de fracción debe ser positivo"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "El número de fracción es obligatorio",
      }),
    
    propietarioId: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
            .int("El propietario debe ser un número entero")
            .positive("El propietario debe ser válido"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "Seleccioná una opción",
      }),
    
    superficie: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          }).min(0, "La superficie no puede ser negativa"),
          z.undefined(),
        ])
      )
      .optional(),
    
    precio: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          }).min(0, "El precio no puede ser negativo"),
          z.undefined(),
        ])
      )
      .optional(),
    
    descripcion: z.string().optional(),
    
    nombreEspacioComun: z.string().optional(),
    
    capacidad: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          }).min(0, "La capacidad no puede ser negativa"),
          z.undefined(),
        ])
      )
      .optional(),
    
    calle: z
      .string()
      .refine((val) => !val || [
        "REINAMORA",
        "MACA",
        "ZORZAL",
        "CAUQUEN",
        "ALONDRA",
        "JACANA",
        "TACUARITO",
        "JILGUERO",
        "GOLONDRINA",
        "CALANDRIA",
        "AGUILAMORA",
        "LORCA",
        "MILANO",
      ].includes(val), {
        message: "Seleccioná una opción válida",
      })
      .optional(),
    
    numeroCalle: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
            .int("El número de calle debe ser un número entero")
            .positive("El número de calle debe ser positivo"),
          z.undefined(),
        ])
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Validar que el nombre del espacio común sea obligatorio si el tipo es "Espacio Comun"
    if (data.tipo === "Espacio Comun") {
      if (!data.nombreEspacioComun || !data.nombreEspacioComun.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El nombre del espacio común es obligatorio",
          path: ["nombreEspacioComun"],
        });
      }
    }
    
    // Validar que el precio sea obligatorio si el tipo es "Lote Venta"
    if (data.tipo === "Lote Venta") {
      if (data.precio == null || data.precio === undefined || data.precio === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `El precio es obligatorio para "Lote Venta"`,
          path: ["precio"],
        });
      }
    }
    
    // Validar que el número de parcela esté dentro del rango permitido para la fracción
    if (data.numero != null && data.fraccionNumero != null) {
      const isValidRange = validateParcelaInRange(data.fraccionNumero, data.numero);
      if (!isValidRange) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No existe un lote con ese número de parcela y esa fracción.",
          path: ["numero"],
        });
      }
    }
  });

