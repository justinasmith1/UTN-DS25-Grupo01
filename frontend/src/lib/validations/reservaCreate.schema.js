import { z } from "zod";
import { addYears, isAfter, startOfDay } from "date-fns";

/**
 * Helper para preprocesar números: convierte "" o NaN a undefined
 */
const preprocessNumber = (val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

/**
 * Schema de validación para Reservas
 */
export const reservaSchema = z
  .object({
    fecha: z.coerce
      .date({
        required_error: "La fecha de reserva es obligatoria",
        invalid_type_error: "Fecha inválida",
      })
      .refine((val) => val !== null, {
        message: "La fecha de reserva es obligatoria",
      }),

    loteId: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
          .int("El lote debe ser un número entero")
          .positive("Seleccioná un lote válido"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "El lote es obligatorio",
      }),

    clienteId: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
          .int("El cliente debe ser un número entero")
          .positive("Seleccioná un cliente válido"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "El comprador es obligatorio",
      }),

    inmobiliariaId: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
          .int("La inmobiliaria debe ser un número entero")
          .positive("Seleccioná una inmobiliaria válida"),
          z.undefined(),
        ])
      )
      .optional(),

    plazoReserva: z.coerce
      .date({
        required_error: "El plazo de reserva es obligatorio",
        invalid_type_error: "Fecha inválida",
      })
      .refine((val) => val !== null, {
        message: "El plazo de reserva es obligatorio",
      }),

    montoSeña: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
          .min(0, "El monto de seña no puede ser negativo"),
          z.undefined(),
        ])
      )
      .optional(),
      
    ofertaInicial: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({
            invalid_type_error: "Debe ser un número válido",
          })
          .min(0, "La oferta inicial no puede ser negativa")
          .positive("La oferta inicial debe ser mayor a 0"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "La oferta inicial es obligatoria",
      }),

    observaciones: z.string().optional(),

    numero: z
      .string({ required_error: "El número es obligatorio" })
      .min(3, "Mínimo 3 caracteres")
      .max(30, "Máximo 30 caracteres"),
    
    // Campos auxiliares para validación condicional (no se envían al backend necesariamente)
    userRole: z.string().optional(),
    estado: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validar que plazo > fecha
    if (data.fecha && data.plazoReserva) {
      // Comparar timestamps para precisión o startOfDay si queremos ignorar horas
      // Asumimos que queremos startOfDay para fechas puras
      const fechaInicio = startOfDay(data.fecha);
      const fechaFin = startOfDay(data.plazoReserva);

      if (!isAfter(fechaFin, fechaInicio)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El plazo debe ser posterior a la fecha de reserva",
          path: ["plazoReserva"],
        });
      }

      // Validar máximo 1 año para INMOBILIARIA
      if (data.userRole === "INMOBILIARIA") {
        const maxDate = addYears(fechaInicio, 1);
        if (isAfter(fechaFin, maxDate)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El plazo máximo es de 1 año para Inmobiliarias",
            path: ["plazoReserva"],
          });
        }
      }
    }
  });

export const reservaCreateSchema = reservaSchema; // Alias por si queremos separar create/edit luego
