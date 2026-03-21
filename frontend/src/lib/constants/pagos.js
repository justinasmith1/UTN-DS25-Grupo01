/**
 * Constantes del submódulo Pagos (single source of truth).
 * Usado por PlanCrearForm, validaciones y cronogramaGenerator.
 */
import { CADENCIA_MESES } from "../../utils/cronogramaGenerator";

export const TIPOS_FINANCIACION = ["CONTADO", "ANTICIPO_CUOTAS", "CUOTAS_FIJAS", "PERSONALIZADO"];

export const MONEDAS = ["ARS", "USD"];

export const TIPOS_CUOTA = ["ANTICIPO", "CUOTA", "OTRO"];

/** Opciones para select de cadencia, derivadas de cronogramaGenerator (single source of truth) */
const CADENCIA_LABELS = {
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  cuatrimestral: "Cuatrimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export const CADENCIA_OPTIONS = Object.keys(CADENCIA_MESES).map((value) => ({
  value,
  label: CADENCIA_LABELS[value] ?? value,
}));

export const TIPOS_FINANCIACION_OPTIONS = [
  { value: "CONTADO", label: "Contado" },
  { value: "ANTICIPO_CUOTAS", label: "Anticipo + cuotas" },
  { value: "CUOTAS_FIJAS", label: "Cuotas fijas" },
  { value: "PERSONALIZADO", label: "Personalizado" },
];

export const MONEDAS_OPTIONS = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
];

export const TIPOS_CUOTA_OPTIONS = [
  { value: "ANTICIPO", label: "Anticipo" },
  { value: "CUOTA", label: "Cuota" },
  { value: "OTRO", label: "Otro" },
];

/** Medios de pago válidos para registrar un pago */
export const MEDIOS_PAGO_OPTIONS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "DEPOSITO", label: "Depósito" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTRO", label: "Otro" },
];

/** Tipo de ingreso del recargo en UI (el backend recibe solo el monto final) */
export const RECARGO_TIPO_OPTIONS = [
  { value: "FIJO", label: "Monto fijo" },
  { value: "PORCENTAJE", label: "Porcentaje" },
];
