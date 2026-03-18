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
  const date = new Date(`${val}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : val;
};

const TIPOS_FINANCIACION = ["CONTADO", "ANTICIPO_CUOTAS", "CUOTAS_FIJAS", "PERSONALIZADO"];
const MONEDAS = ["ARS", "USD"];
const TIPOS_CUOTA = ["ANTICIPO", "CUOTA", "OTRO"];

const cuotaFormSchema = z.object({
  numeroCuota: z
    .preprocess(
      preprocessNumber,
      z.union([
        z.number({ invalid_type_error: "Debe ser un número válido" })
          .int("El número de cuota debe ser entero")
          .positive("El número de cuota debe ser positivo"),
        z.undefined(),
      ])
    )
    .refine((val) => val !== undefined, {
      message: "Número de cuota obligatorio y positivo",
    }),

  tipoCuota: z
    .string()
    .refine((val) => val && val !== "" && TIPOS_CUOTA.includes(val), {
      message: "Tipo de cuota obligatorio",
    }),

  fechaVencimiento: z
    .preprocess(
      validateDateString,
      z.union([
        z.string().refine((val) => {
          if (!val) return false;
          const date = new Date(`${val}T12:00:00.000Z`);
          return !Number.isNaN(date.getTime());
        }, { message: "Fecha de vencimiento obligatoria" }),
        z.undefined(),
      ])
    )
    .refine((val) => val !== undefined, {
      message: "Fecha de vencimiento obligatoria",
    }),

  montoOriginal: z
    .preprocess(
      preprocessNumber,
      z.union([
        z.number({ invalid_type_error: "Debe ser un número válido" }).positive("Monto debe ser mayor a 0"),
        z.undefined(),
      ])
    )
    .refine((val) => val !== undefined, {
      message: "Monto debe ser mayor a 0",
    }),

  descripcion: z.string().optional().default(""),
});

export const planPagoCreateSchema = z
  .object({
    nombre: z
      .string({ required_error: "El nombre es obligatorio" })
      .min(1, "El nombre es obligatorio")
      .max(100, "El nombre es demasiado largo")
      .trim(),

    tipoFinanciacion: z
      .string()
      .refine((val) => val && val !== "" && TIPOS_FINANCIACION.includes(val), {
        message: "El tipo de financiación es obligatorio",
      }),

    moneda: z
      .string()
      .refine((val) => val && val !== "" && MONEDAS.includes(val), {
        message: "La moneda es obligatoria",
      }),

    cantidadCuotas: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({ invalid_type_error: "Debe ser un número válido" })
            .int("La cantidad de cuotas debe ser un entero")
            .positive("La cantidad de cuotas debe ser un número positivo"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "La cantidad de cuotas debe ser un número positivo",
      }),

    montoTotalPlanificado: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({ invalid_type_error: "Debe ser un número válido" }).positive("El monto debe ser mayor a 0"),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "El monto debe ser mayor a 0",
      }),

    fechaInicio: z
      .preprocess(
        validateDateString,
        z.union([
          z.string().refine((val) => {
            if (!val) return false;
            const date = new Date(`${val}T12:00:00.000Z`);
            return !Number.isNaN(date.getTime());
          }, { message: "La fecha de inicio es inválida" }),
          z.undefined(),
        ])
      )
      .refine((val) => val !== undefined, {
        message: "La fecha de inicio es obligatoria",
      }),

    montoAnticipo: z
      .preprocess(
        preprocessNumber,
        z.union([
          z.number({ invalid_type_error: "Debe ser un número válido" }).min(0, "El anticipo debe ser mayor o igual a 0"),
          z.undefined(),
        ])
      )
      .optional(),

    observaciones: z.string().optional().default(""),
    descripcion: z.string().optional().default(""),
    cuotas: z.array(cuotaFormSchema).min(1, "Debe haber al menos una cuota"),
  })
  .refine(
    (data) => {
      const anticipo = data.montoAnticipo ?? 0;
      return data.montoTotalPlanificado >= anticipo;
    },
    { message: "El anticipo no puede superar el monto total planificado", path: ["montoAnticipo"] }
  )
  .refine(
    (data) => data.cantidadCuotas === data.cuotas.length,
    {
      message: "Debe haber la misma cantidad de cuotas que la indicada",
      path: ["cantidadCuotas"],
    }
  )
  .refine(
    (data) => {
      const numeros = data.cuotas.map((c) => c.numeroCuota).filter((n) => n != null);
      return new Set(numeros).size === numeros.length;
    },
    { message: "No puede haber números de cuota repetidos", path: ["cuotas"] }
  )
  .superRefine((data, ctx) => {
    if (!data.fechaInicio) return;
    const fechaInicioTs = new Date(`${data.fechaInicio}T12:00:00.000Z`).getTime();
    data.cuotas.forEach((c, i) => {
      if (!c.fechaVencimiento) return;
      const vtoTs = new Date(`${c.fechaVencimiento}T12:00:00.000Z`).getTime();
      if (vtoTs < fechaInicioTs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El vencimiento no puede ser anterior a la fecha de inicio del plan",
          path: ["cuotas", i, "fechaVencimiento"],
        });
      }
    });
  });
