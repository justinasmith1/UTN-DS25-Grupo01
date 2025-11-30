// utils/ventasChips.js
// Genera los chips visibles arriba de la tabla.
// Cambios: soporta inmobiliarias en plural y singular.

const getLabel = (x) => {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  if (typeof x === "object") return x.label ?? x.name ?? x.value ?? "";
  return String(x);
};

export const nice = (s) =>
  getLabel(s)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function ventasChipsFrom(applied, catalogs = {}) {
  const arr = [];

  if (applied.q) {
    arr.push({ k: "q", label: `Buscar: ${applied.q}` });
  }

  // Estado: soportar 'estado', 'estados' y 'estadoVenta'
  const estados =
    applied.estado || applied.estados || applied.estadoVenta || [];
  (estados || []).forEach((v) =>
    arr.push({ k: "estado", v, label: `Estado: ${nice(v)}` })
  );

  (applied.tipoPago || []).forEach((v) =>
    arr.push({ k: "tipoPago", v, label: `Tipo de pago: ${nice(v)}` })
  );

  // Inmobiliarias (plural, como el field.id)
  // Buscar el nombre en el catálogo si solo viene el ID
  const inmCatalog = catalogs?.inmobiliarias || [];
  (applied.inmobiliarias || []).forEach((v) => {
    let label = getLabel(v);
    // Si el valor es un ID (número o string numérico), buscar el nombre en el catálogo
    if (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v))) {
      const found = inmCatalog.find(opt => String(opt.value) === String(v));
      if (found) label = found.label;
    }
    arr.push({ k: "inmobiliarias", v, label: `Inmobiliaria: ${label}` });
  });

  if (
    applied.fechaVenta &&
    (applied.fechaVenta.min !== null || applied.fechaVenta.max !== null)
  ) {
    if (applied.fechaVenta.min !== null && applied.fechaVenta.max !== null) {
      const minDate = new Date(applied.fechaVenta.min).toLocaleDateString();
      const maxDate = new Date(applied.fechaVenta.max).toLocaleDateString();
      arr.push({ k: "fechaVenta", label: `Fecha: ${minDate} - ${maxDate}` });
    } else if (applied.fechaVenta.min !== null) {
      const minDate = new Date(applied.fechaVenta.min).toLocaleDateString();
      arr.push({ k: "fechaVenta", label: `Fecha: ≥ ${minDate}` });
    } else if (applied.fechaVenta.max !== null) {
      const maxDate = new Date(applied.fechaVenta.max).toLocaleDateString();
      arr.push({ k: "fechaVenta", label: `Fecha: ≤ ${maxDate}` });
    }
  }

  if (
    applied.monto &&
    (applied.monto.min !== null || applied.monto.max !== null)
  ) {
    if (applied.monto.min !== null && applied.monto.max !== null) {
      arr.push({
        k: "monto",
        label: `Monto: ${applied.monto.min} - ${applied.monto.max} USD`,
      });
    } else if (applied.monto.min !== null) {
      arr.push({ k: "monto", label: `Monto: ≥ ${applied.monto.min} USD` });
    } else if (applied.monto.max !== null) {
      arr.push({ k: "monto", label: `Monto: ≤ ${applied.monto.max} USD` });
    }
  }

  return arr;
}
