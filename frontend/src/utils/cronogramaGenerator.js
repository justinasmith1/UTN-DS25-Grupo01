// src/utils/cronogramaGenerator.js
// Generación asistida de cronograma para planes de pago (Bloque 2A I3).
// Montos en 2 decimales; redondeo ajustado en la última cuota.

const CADENCIA_MESES = {
  mensual: 1,
  bimestral: 2,
  trimestral: 3,
  cuatrimestral: 4,
  semestral: 6,
  anual: 12,
};

/**
 * Suma meses a una fecha base.
 * @param {string} baseDateStr - Fecha en formato YYYY-MM-DD
 * @param {number} months - Cantidad de meses a sumar
 * @returns {string} Fecha resultante en YYYY-MM-DD
 */
export function addMonthsToDate(baseDateStr, months) {
  if (!baseDateStr || !baseDateStr.trim()) return "";
  const d = new Date(`${baseDateStr}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCMonth(d.getUTCMonth() + months);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formato de cuota para el formulario (valores string para inputs).
 */
function toCuotaForm(numeroCuota, tipoCuota, fechaVencimiento, montoOriginal, descripcion = "") {
  return {
    numeroCuota: String(numeroCuota),
    tipoCuota,
    fechaVencimiento: String(fechaVencimiento),
    montoOriginal: String(Number(montoOriginal).toFixed(2)),
    descripcion: descripcion || "",
  };
}

/**
 * Genera una sola cuota para CONTADO.
 * @param {number} montoTotal - Monto total del plan
 * @param {string} primerVencimiento - Fecha YYYY-MM-DD
 */
export function generateCuotasContado(montoTotal, primerVencimiento) {
  return [
    toCuotaForm(1, "CUOTA", primerVencimiento, montoTotal),
  ];
}

/**
 * Genera cuotas fijas para CUOTAS_FIJAS.
 * montoFinanciado se divide en cantidadCuotas partes iguales.
 * Redondeo: ajuste en la última cuota si hay diferencia por centavos.
 *
 * @param {number} cantidadCuotas - Cantidad de cuotas
 * @param {number} montoFinanciado - Monto a distribuir (montoTotalPlanificado - anticipo)
 * @param {string} primerVencimiento - Fecha YYYY-MM-DD
 * @param {string} cadencia - mensual, bimestral, etc.
 */
export function generateCuotasFijas(cantidadCuotas, montoFinanciado, primerVencimiento, cadencia) {
  if (cantidadCuotas <= 0 || montoFinanciado <= 0) return [];
  const mesesPorCuota = CADENCIA_MESES[cadencia] ?? 1;
  const cuotas = [];
  const montoBase = montoFinanciado / cantidadCuotas;
  const montoRedondeado = Math.round(montoBase * 100) / 100;
  let sumaAcum = 0;

  for (let i = 0; i < cantidadCuotas; i++) {
    const num = i + 1;
    const vto = addMonthsToDate(primerVencimiento, i * mesesPorCuota);
    const esUltima = i === cantidadCuotas - 1;
    let monto;
    if (esUltima) {
      const resto = montoFinanciado - sumaAcum;
      monto = Math.round(resto * 100) / 100;
      if (monto <= 0) monto = montoRedondeado;
    } else {
      monto = montoRedondeado;
    }
    sumaAcum += monto;
    cuotas.push(toCuotaForm(num, "CUOTA", vto, monto));
  }

  return cuotas;
}

/**
 * Genera cuotas para ANTICIPO_CUOTAS:
 * - 1 cuota tipo ANTICIPO con montoAnticipo
 * - (cantidadCuotas - 1) cuotas tipo CUOTA que sumen montoFinanciado
 *
 * @param {number} montoAnticipo - Monto de la cuota anticipo
 * @param {number} cantidadCuotas - Total de cuotas (incluye anticipo)
 * @param {number} montoFinanciado - Monto a distribuir en las cuotas restantes
 * @param {string} primerVencimiento - Fecha YYYY-MM-DD
 * @param {string} cadencia - mensual, bimestral, etc.
 */
export function generateCuotasAnticipo(montoAnticipo, cantidadCuotas, montoFinanciado, primerVencimiento, cadencia) {
  const cuotasRestantes = cantidadCuotas - 1;
  const cuotas = [];

  cuotas.push(toCuotaForm(1, "ANTICIPO", primerVencimiento, montoAnticipo));

  if (cuotasRestantes <= 0) return cuotas;
  if (montoFinanciado <= 0) return cuotas;

  const mesesPorCuota = CADENCIA_MESES[cadencia] ?? 1;
  const montoBase = montoFinanciado / cuotasRestantes;
  const montoRedondeado = Math.round(montoBase * 100) / 100;
  let sumaAcum = 0;

  for (let i = 0; i < cuotasRestantes; i++) {
    const num = i + 2;
    const vto = addMonthsToDate(primerVencimiento, (i + 1) * mesesPorCuota);
    const esUltima = i === cuotasRestantes - 1;
    let monto;
    if (esUltima) {
      const resto = montoFinanciado - sumaAcum;
      monto = Math.round(resto * 100) / 100;
      if (monto <= 0) monto = montoRedondeado;
    } else {
      monto = montoRedondeado;
    }
    sumaAcum += monto;
    cuotas.push(toCuotaForm(num, "CUOTA", vto, monto));
  }

  return cuotas;
}

export { CADENCIA_MESES };
