/**
 * Schema de validación para registrar un pago (Bloque 1 I4).
 * La cuota es la habilitada; cuotaId se pasa desde el contexto.
 */
import { z } from "zod";
import { MEDIOS_PAGO_OPTIONS } from "../constants/pagos";

const MEDIOS_PAGO_VALUES = MEDIOS_PAGO_OPTIONS.map((o) => o.value);

/** Parsea monto desde input (vacío → undefined; soporta 5000.5 o 5.000,00) */
function parseMontoInput(val) {
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
 * Crea el schema de registro de pago con el saldo pendiente de la cuota habilitada.
 * @param {number} saldoPendiente - Saldo pendiente de la cuota habilitada
 * @returns {z.ZodSchema}
 */
export function createRegistrarPagoSchema(saldoPendiente) {
  const saldo = Number(saldoPendiente) || 0;
  return z.object({
    fechaPago: z
      .string()
      .min(1, "Fecha de pago obligatoria")
      .refine((v) => !Number.isNaN(new Date(`${v}T12:00:00`).getTime()), "Fecha inválida"),
    monto: z
      .union([z.string(), z.number()])
      .refine(
        (val) => val !== "" && val !== null && val !== undefined && !(typeof val === "string" && val.trim() === ""),
        { message: "Monto obligatorio" }
      )
      .refine((val) => parseMontoInput(val) !== undefined, {
        message: "Ingresá un monto válido",
      })
      .refine((val) => {
        const n = parseMontoInput(val);
        return n !== undefined && n > 0;
      }, { message: "El monto debe ser mayor a 0" })
      .refine((val) => {
        const n = parseMontoInput(val);
        return n !== undefined && n <= saldo;
      }, {
        message: `El monto no puede exceder el saldo pendiente (${saldo.toLocaleString("es-AR", { minimumFractionDigits: 2 })})`,
      })
      .transform((val) => parseMontoInput(val)),
    // No usar z.enum solo: en Zod 4 el mensaje por defecto expone los valores técnicos.
    medioPago: z
      .union([z.string(), z.undefined(), z.null()])
      .refine(
        (v) => {
          const s = v == null ? "" : String(v).trim();
          return s !== "" && MEDIOS_PAGO_VALUES.includes(s);
        },
        { message: "Debe elegir un medio de Pago" }
      )
      .transform((v) => (v == null ? "" : String(v).trim())),
    referencia: z.string().trim().optional(),
    observacion: z.string().trim().optional(),
  });
}
