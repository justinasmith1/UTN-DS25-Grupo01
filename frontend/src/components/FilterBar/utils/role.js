// Sanitiza filtros según el rol (usado por aplicar/guardar vistas)
export function sanitizeFiltersForRole(filters, isInmo) {
  const f = JSON.parse(JSON.stringify(filters || {}));
  if (isInmo) {
    f.estado = Array.isArray(f.estado) ? f.estado.filter((e) => e !== "NO_DISPONIBLE") : [];
    f.deudor = null;
  }
  return f;
}
