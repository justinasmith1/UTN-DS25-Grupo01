/**
 * Utilidades compartidas del submódulo Pagos (frontend).
 */

/**
 * Formatea un monto según moneda del plan (ARS/USD).
 * @param {unknown} v
 * @param {string} [moneda="ARS"]
 * @returns {string}
 */
export function fmtMonto(v, moneda = "ARS") {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const currency = String(moneda || "ARS").toUpperCase();
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "ARS",
    maximumFractionDigits: 2,
  });
}

/**
 * Formato numérico local sin símbolo de moneda (ej. monto de venta antes de definir plan).
 */
export function fmtMontoSinMoneda(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
