// src/utils/applyVentaFilters.js
// Filtra ventas en memoria, tolerante a distintas formas/formatos de datos.

const norm = (v) =>
  (v ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[_\s]+/g, " ")
    .trim();

const toNumber = (v) => {
  if (v == null) return null;
  // admite "50.000", "50,000", "$ 50.000", etc.
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const toTime = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
};

export function applyVentaFilters(rows = [], f = {}) {
  const {
    texto = "",
    // arrays (pueden venir como strings, números o incluso objetos con { id })
    tipoPago = [],
    inmobiliarias = [],

    // rangos
    fechaVentaMin = null,
    fechaVentaMax = null,
    montoMin = null,
    montoMax = null,

    // estado puede venir ["Iniciada", "CON_BOLETO", ...]
    estados = [],
  } = f;

  // Normalizaciones base
  const q = norm(texto);
  const estadosSet =
    estados && estados.length
      ? new Set(estados.map((e) => norm(e)))
      : null;

  // Aceptar ids de inmobiliaria como [1, "2", { id: 3 }]
  const inmoIdsSet =
    inmobiliarias && inmobiliarias.length
      ? new Set(
          inmobiliarias.map((x) => {
            if (x && typeof x === "object") return String(x.id ?? x.value ?? "");
            return String(x ?? "");
          })
        )
      : null;

  // Rango de fechas (milisegundos)
  const tMin = toTime(fechaVentaMin);
  const tMax = toTime(fechaVentaMax);

  // Rango de montos (números)
  const nMin = toNumber(montoMin);
  const nMax = toNumber(montoMax);

  return rows.filter((v) => {
    // ----- Campos base normalizados -----
    const estadoNorm = norm(v.estado);
    const tipoPagoNorm = norm(v.tipoPago);

    // Inmobiliaria: id y nombre (por si filtras por texto)
    const inmoId = v?.inmobiliaria?.id ?? v?.inmobiliariaId ?? v?.inmobiliaria_id ?? null;
    const inmoIdStr = inmoId != null ? String(inmoId) : "";
    const inmoNombreNorm = norm(v?.inmobiliaria?.nombre);

    // Comprador para búsqueda por texto
    const compradorNorm = norm(
      v?.compradorNombreCompleto ??
        (v?.comprador && (v.comprador.nombre || v.comprador.apellido)
          ? `${v.comprador.nombre ?? ""} ${v.comprador.apellido ?? ""}`
          : "")
    );

    // Lote e id para búsqueda por texto
    const loteIdStr = v?.loteId != null ? String(v.loteId) : "";
    const ventaIdStr = v?.id != null ? String(v.id) : "";

    // Monto y Fecha
    const montoNum = toNumber(v.monto);
    const fechaMs = toTime(v.fechaVenta);

    // ----- 1) Texto libre -----
    if (q) {
      const haystack = [
        loteIdStr,
        ventaIdStr,
        compradorNorm,
        inmoNombreNorm,
        estadoNorm,
        tipoPagoNorm,
      ].join(" ");
      if (!haystack.includes(q)) return false;
    }

    // ----- 2) Estados -----
    if (estadosSet && estadosSet.size > 0) {
      if (!estadosSet.has(estadoNorm)) return false;
    }

    // ----- 3) Tipo de Pago (si llega como lista) -----
    if (Array.isArray(tipoPago) && tipoPago.length > 0) {
      const tiposSet = new Set(tipoPago.map((t) => norm(t)));
      if (!tiposSet.has(tipoPagoNorm)) return false;
    }

    // ----- 4) Inmobiliarias -----
    if (inmoIdsSet && inmoIdsSet.size > 0) {
      // match por id (preferente) o por nombre: con que coincida una alcanza
      const matchById = inmoIdStr && inmoIdsSet.has(inmoIdStr);
      const matchByName =
        inmoNombreNorm &&
        [...inmoIdsSet].some((x) => {
          try {
            return norm(x) === inmoNombreNorm;
          } catch (e) {
            return false;
          }
        });

      if (!matchById && !matchByName) return false;
    }

    // ----- 5) Rango de fechas -----
    if (tMin != null && (fechaMs == null || fechaMs < tMin)) return false;
    if (tMax != null && (fechaMs == null || fechaMs > tMax)) return false;

    // ----- 6) Rango de montos -----
    if (nMin != null && (montoNum == null || montoNum < nMin)) return false;
    if (nMax != null && (montoNum == null || montoNum > nMax)) return false;

    return true;
  });
}

export default applyVentaFilters;
