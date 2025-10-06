// src/utils/applyVentaFilters.js
export function applyVentaFilters(allVentas = [], p = {}) {
  const norm = (s) => (s ?? "").toString().trim().toUpperCase().replace(/\s+/g, "_");
  const getEstado = (v) => v?.status || v?.estado || "";
  const getTipoPago = (v) => v?.paymentType || v?.tipoPago || "";
  const getInmobiliaria = (v) => v?.inmobiliariaId || v?.inmobiliaria || "";
  const num = (x) => (x === null || x === undefined || x === "" ? NaN : +x);

  const getFechaVenta = (v) => {
    const date = v?.date || v?.fechaVenta || v?.saleDate;
    if (!date) return NaN;
    return new Date(date).getTime();
  };
  const getMonto = (v) => num(v?.amount ?? v?.monto ?? v?.price ?? v?.precio);
  const getPlazoEscritura = (v) => num(v?.plazoEscritura ?? v?.deedDeadline ?? v?.deadline);

  let rows = [...(allVentas || [])];

  // Búsqueda por texto
  const q = (p.q || "").toString().trim().toLowerCase();
  if (q) {
    rows = rows.filter((v) => {
      const idStr = String(v?.id ?? "");
      const lotId = String(v?.lotId ?? "");
      const amount = String(v?.amount ?? "");
      return idStr.includes(q) || lotId.includes(q) || amount.includes(q);
    });
  }

  // Filtros de arrays
  if (Array.isArray(p.estado) && p.estado.length > 0) {
    const set = new Set(p.estado.map(norm));
    rows = rows.filter((v) => set.has(norm(getEstado(v))));
  }

  if (Array.isArray(p.tipoPago) && p.tipoPago.length > 0) {
    const set = new Set(p.tipoPago.map(norm));
    rows = rows.filter((v) => set.has(norm(getTipoPago(v))));
  }

  if (Array.isArray(p.inmobiliaria) && p.inmobiliaria.length > 0) {
    const set = new Set(p.inmobiliaria.map(norm));
    rows = rows.filter((v) => set.has(norm(getInmobiliaria(v))));
  }

  // Función para rangos
  const inRange = (val, min, max) => {
    const v = Number.isFinite(val) ? val : NaN;
    if (Number.isNaN(v)) return false;
    if (min !== undefined && min !== null && v < +min) return false;
    if (max !== undefined && max !== null && v > +max) return false;
    return true;
  };

  // Filtros de rango - solo aplicar si hay valores válidos (no null)
  if ((p.fechaVenta?.min !== undefined && p.fechaVenta?.min !== null) || 
      (p.fechaVenta?.max !== undefined && p.fechaVenta?.max !== null)) {
    rows = rows.filter((v) => inRange(getFechaVenta(v), p.fechaVenta?.min, p.fechaVenta?.max));
  }

  if ((p.monto?.min !== undefined && p.monto?.min !== null) || 
      (p.monto?.max !== undefined && p.monto?.max !== null)) {
    rows = rows.filter((v) => inRange(getMonto(v), p.monto?.min, p.monto?.max));
  }

  if ((p.plazoEscritura?.min !== undefined && p.plazoEscritura?.min !== null) || 
      (p.plazoEscritura?.max !== undefined && p.plazoEscritura?.max !== null)) {
    rows = rows.filter((v) => inRange(getPlazoEscritura(v), p.plazoEscritura?.min, p.plazoEscritura?.max));
  }

  return rows;
}
