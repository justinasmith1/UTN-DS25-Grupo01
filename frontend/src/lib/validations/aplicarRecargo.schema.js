import { z } from "zod";
import { RECARGO_TIPO_OPTIONS } from "../constants/pagos";

const TIPOS_RECARGO = RECARGO_TIPO_OPTIONS.map((o) => o.value);

function parseMontoOPorcentaje(val) {
  if (val === "" || val === null || val === undefined) return undefined;
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : undefined;
  }
  const s = String(val).trim();
  if (!s) return undefined;
  if (s.includes(",")) {
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : undefined;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * @param {number} montoOriginal - Base para validar modo porcentaje
 */
export function createAplicarRecargoSchema(montoOriginal) {
  const orig = Number(montoOriginal) || 0;

  return z
    .object({
      tipoRecargo: z
        .union([z.string(), z.undefined(), z.null()])
        .refine(
          (v) => {
            const s = v == null ? "" : String(v).trim();
            return s !== "" && TIPOS_RECARGO.includes(s);
          },
          { message: "Elegí el tipo de recargo" }
        )
        .transform((v) => String(v).trim()),
      valor: z.union([z.string(), z.number()]),
    })
    .superRefine((data, ctx) => {
      const n = parseMontoOPorcentaje(data.valor);
      if (n === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            data.tipoRecargo === "PORCENTAJE"
              ? "Ingresá un porcentaje válido"
              : "Ingresá un monto válido",
          path: ["valor"],
        });
        return;
      }
      if (n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El valor debe ser mayor a 0",
          path: ["valor"],
        });
      }
      if (data.tipoRecargo === "PORCENTAJE" && orig <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "No se puede calcular porcentaje: monto original inválido",
          path: ["valor"],
        });
      }
    });
}

export function parseValorRecargo(val) {
  return parseMontoOPorcentaje(val);
}

/** Redondeo a 2 decimales para coincidir con Decimal(12,2) */
export function roundRecargoMonto(n) {
  return Math.round(Number(n) * 100) / 100;
}
