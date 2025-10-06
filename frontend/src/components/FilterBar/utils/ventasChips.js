// Formateador de chips específico para ventas
// Convierte los filtros aplicados en "chips" para mostrar en la UI de ventas

export const nice = (s) =>
  (s ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export function ventasChipsFrom(applied, catalogs) {
  const arr = [];
  
  // Búsqueda
  if (applied.q) {
    arr.push({ k: "q", label: `Buscar: ${applied.q}` });
  }

  // Estado - formatear con nice()
  (applied.estado || [])
    .forEach((v) => arr.push({ k: "estado", v, label: `Estado: ${nice(v)}` }));

  // Tipo de pago - formatear con nice()
  (applied.tipoPago || [])
    .forEach((v) => arr.push({ k: "tipoPago", v, label: `Tipo de pago: ${nice(v)}` }));

  // Inmobiliaria
  (applied.inmobiliaria || [])
    .forEach((v) => arr.push({ k: "inmobiliaria", v, label: `Inmobiliaria: ${v}` }));

  // Fecha de venta (rango)
  if (applied.fechaVenta && (applied.fechaVenta.min !== null || applied.fechaVenta.max !== null)) {
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

  // Monto (rango)
  if (applied.monto && (applied.monto.min !== null || applied.monto.max !== null)) {
    if (applied.monto.min !== null && applied.monto.max !== null) {
      arr.push({ k: "monto", label: `Monto: ${applied.monto.min} - ${applied.monto.max} USD` });
    } else if (applied.monto.min !== null) {
      arr.push({ k: "monto", label: `Monto: ≥ ${applied.monto.min} USD` });
    } else if (applied.monto.max !== null) {
      arr.push({ k: "monto", label: `Monto: ≤ ${applied.monto.max} USD` });
    }
  }

  // Plazo de escritura (rango)
  if (applied.plazoEscritura && (applied.plazoEscritura.min !== null || applied.plazoEscritura.max !== null)) {
    if (applied.plazoEscritura.min !== null && applied.plazoEscritura.max !== null) {
      arr.push({ k: "plazoEscritura", label: `Plazo: ${applied.plazoEscritura.min} - ${applied.plazoEscritura.max} días` });
    } else if (applied.plazoEscritura.min !== null) {
      arr.push({ k: "plazoEscritura", label: `Plazo: ≥ ${applied.plazoEscritura.min} días` });
    } else if (applied.plazoEscritura.max !== null) {
      arr.push({ k: "plazoEscritura", label: `Plazo: ≤ ${applied.plazoEscritura.max} días` });
    }
  }

  return arr;
}