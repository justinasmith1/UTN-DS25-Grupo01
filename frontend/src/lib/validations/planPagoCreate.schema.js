import { z } from "zod";
import { TIPOS_FINANCIACION, MONEDAS, TIPOS_CUOTA } from "../constants/pagos";

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

/** Tolerancia de redondeo para comparar montos (centavos) */
const TOLERANCIA_MONTO = 0.01;

/** Monto esperado que debe sumar el cronograma según tipo de financiación */
function getMontoEsperadoParaCronograma(data) {
  const total = data.montoTotalPlanificado ?? 0;
  const anticipo = data.montoAnticipo ?? 0;
  switch (data.tipoFinanciacion) {
    case "CONTADO":
      return total;
    case "PERSONALIZADO":
      return anticipo > 0 ? total - anticipo : total;
    case "CUOTAS_FIJAS":
      return total - anticipo;
    case "ANTICIPO_CUOTAS":
      return total; // tabla incluye cuota anticipo
    default:
      return total;
  }
}

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
    (data) => {
      if (data.tipoFinanciacion !== "ANTICIPO_CUOTAS") return true;
      const anticipo = data.montoAnticipo ?? 0;
      return anticipo > 0;
    },
    {
      message: "Para Anticipo + cuotas, el anticipo es obligatorio y debe ser mayor a 0",
      path: ["montoAnticipo"],
    }
  )
  .refine(
    (data) => {
      if (data.tipoFinanciacion !== "ANTICIPO_CUOTAS") return true;
      const anticipo = data.montoAnticipo ?? 0;
      return anticipo < data.montoTotalPlanificado;
    },
    {
      message: "El anticipo debe ser menor al monto total planificado",
      path: ["montoAnticipo"],
    }
  )
  .refine(
    (data) => {
      if (data.tipoFinanciacion !== "CONTADO") return true;
      const anticipo = data.montoAnticipo ?? 0;
      return anticipo === 0;
    },
    {
      message: "Para Contado, el anticipo no aplica y debe ser 0",
      path: ["montoAnticipo"],
    }
  )
  .refine(
    (data) => data.cantidadCuotas === data.cuotas.length,
    {
      message: "Debe haber la misma cantidad de cuotas que la indicada",
      path: ["cantidadCuotas"],
    }
  )
  .superRefine((data, ctx) => {
    const numeros = data.cuotas.map((c) => c.numeroCuota).filter((n) => n != null);
    const duplicados = new Map();
    numeros.forEach((n, i) => {
      if (!duplicados.has(n)) duplicados.set(n, []);
      duplicados.get(n).push(i);
    });
    const indicesConDuplicado = new Set();
    duplicados.forEach((indices) => {
      if (indices.length > 1) indices.forEach((i) => indicesConDuplicado.add(i));
    });
    if (indicesConDuplicado.size > 0) {
      indicesConDuplicado.forEach((i) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Número de cuota duplicado",
          path: ["cuotas", i, "numeroCuota"],
        });
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hay números de cuota repetidos",
        path: ["cuotas"],
      });
    }
  })
  .superRefine((data, ctx) => {
    const montoEsperado = getMontoEsperadoParaCronograma(data);
    const sumaCuotas = data.cuotas.reduce((acc, c) => acc + (Number(c.montoOriginal) || 0), 0);
    const diff = Math.abs(sumaCuotas - montoEsperado);
    if (diff > TOLERANCIA_MONTO) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `La suma de las cuotas (${sumaCuotas.toFixed(2)}) no coincide con el monto esperado (${montoEsperado.toFixed(2)})`,
        path: ["cuotas"],
      });
    }
  })
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
