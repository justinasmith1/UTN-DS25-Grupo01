import { z } from "zod";

/** Helper para preprocesar números: convierte "" o NaN a undefined */
const preprocessNumber = (val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

/** Helper para validar fechas: verifica que sea una fecha válida (formato YYYY-MM-DD) */
const validateDateString = (val) => {
  if (!val || val === "" || val === null || val === undefined) return undefined;
  const date = new Date(`${val}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : val; // Devolver el string original, no ISO
};

/** Schema de validación para crear una prioridad usando Zod */
export const prioridadCreateSchema = z
  .object({
    numero: z
      .string({ required_error: "El número de prioridad es obligatorio", invalid_type_error: "El número de prioridad debe ser texto",})
      .min(1, "El número de prioridad es obligatorio")
      .trim()
      .refine((val) => val.trim().length > 0, { message: "El número de prioridad es obligatorio",}),
    loteId: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({invalid_type_error: "Debe ser un número válido",})
            .int("El lote debe ser un número entero")
            .positive("El lote debe ser válido"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "El lote es obligatorio",
      }),
    
    fechaInicio: z
      .preprocess(
        validateDateString,
        z.union([
          z.string({ required_error: "La fecha de inicio es obligatoria", invalid_type_error: "La fecha de inicio es inválida", }).refine((val) => {
            if (!val) return false;
            const date = new Date(`${val}T00:00:00.000Z`);
            return !Number.isNaN(date.getTime());
          }, {
            message: "La fecha de inicio es inválida",
          }),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "La fecha de inicio es obligatoria",
      }),
    
    fechaFin: z
      .preprocess(
        validateDateString,
        z.union([
          z.string({required_error: "La fecha de fin es obligatoria",invalid_type_error: "La fecha de fin es inválida", }).refine((val) => {
            if (!val) return false;
            const date = new Date(`${val}T23:59:59.999Z`);
            return !Number.isNaN(date.getTime());
          }, {
            message: "La fecha de fin es inválida",
          }),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "La fecha de fin es obligatoria",
      }),
    
    inmobiliariaId: z
      .string()
      .optional()
      .refine((val) => !val || val === "" || val === "La Federala" || !Number.isNaN(Number(val)), {
        message: "La inmobiliaria seleccionada es inválida",
      }),
  })
  .refine(
    (data) => {
      if (!data.fechaInicio || !data.fechaFin) return true;
      const fechaInicioDate = new Date(`${data.fechaInicio}T00:00:00.000Z`);
      const fechaFinDate = new Date(`${data.fechaFin}T23:59:59.999Z`);
      return fechaFinDate > fechaInicioDate;
    },
    {
      message: "La fecha de fin debe ser posterior a la fecha de inicio",
      path: ["fechaFin"],
    }
  )
  .refine(
    (data) => {
      if (!data.fechaFin) return true;
      const fechaFinDate = new Date(`${data.fechaFin}T23:59:59.999Z`);
      const now = new Date();
      return fechaFinDate > now;
    },
    {
      message: "La fecha de fin debe ser posterior a la fecha actual",
      path: ["fechaFin"],
    }
  );
