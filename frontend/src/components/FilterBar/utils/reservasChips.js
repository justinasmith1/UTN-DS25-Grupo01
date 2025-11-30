// src/components/FilterBar/utils/reservasChips.js
// Contrato compatible con FilterBarBase y Ventas

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

export function reservasChipsFrom(applied, catalogs) {
  const chips = [];

  if (applied.q) {
    chips.push({ k: "q", label: `Buscar: ${applied.q}` });
  }

  // Estado (plural, como el field.id)
  (applied.estado || []).forEach((v) => {
    chips.push({ k: "estado", v, label: `Estado: ${nice(v)}` });
  });

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
    chips.push({ k: "inmobiliarias", v, label: `Inmobiliaria: ${label}` });
  });

  // Fecha de Reserva
  if (applied.fechaReserva && (applied.fechaReserva.min !== null || applied.fechaReserva.max !== null)) {
    const { min, max } = applied.fechaReserva;
    const minStr = min !== null ? new Date(min).toLocaleDateString("es-AR") : "∞";
    const maxStr = max !== null ? new Date(max).toLocaleDateString("es-AR") : "∞";
    chips.push({ k: "fechaReserva", v: { min, max }, label: `Fecha Reserva: ${minStr} - ${maxStr}` });
  }

  // Fecha de Creación
  if (applied.fechaCreacion && (applied.fechaCreacion.min !== null || applied.fechaCreacion.max !== null)) {
    const { min, max } = applied.fechaCreacion;
    const minStr = min !== null ? new Date(min).toLocaleDateString("es-AR") : "∞";
    const maxStr = max !== null ? new Date(max).toLocaleDateString("es-AR") : "∞";
    chips.push({ k: "fechaCreacion", v: { min, max }, label: `Fecha Creación: ${minStr} - ${maxStr}` });
  }

  // Seña (USD)
  if (applied.seña && (applied.seña.min !== null || applied.seña.max !== null)) {
    const { min, max } = applied.seña;
    const minStr = min !== null ? `$${Number(min).toLocaleString("es-AR")}` : "∞";
    const maxStr = max !== null ? `$${Number(max).toLocaleString("es-AR")}` : "∞";
    chips.push({ k: "seña", v: { min, max }, label: `Seña: ${minStr} - ${maxStr} USD` });
  }

  return chips;
}
