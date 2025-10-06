// src/utils/applyReservaFilters.js
// Función para aplicar filtros locales a las reservas

export const applyReservaFilters = (reservas, params) => {
  if (!Array.isArray(reservas)) return [];

  let filtered = [...reservas];

  // Filtro de búsqueda general (q)
  if (params.q) {
    const query = params.q.toLowerCase();
    filtered = filtered.filter(r => 
      r.clienteCompleto?.toLowerCase().includes(query) ||
      r.clienteNombre?.toLowerCase().includes(query) ||
      r.clienteApellido?.toLowerCase().includes(query) ||
      r.inmobiliariaNombre?.toLowerCase().includes(query) ||
      r.loteInfo?.calle?.toLowerCase().includes(query) ||
      String(r.loteInfo?.numero).includes(query) ||
      String(r.loteInfo?.fraccion).includes(query) ||
      String(r.id).includes(query)
    );
  }

  // Filtro por fecha de reserva (rango)
  if (params.fechaReserva) {
    const { min, max } = params.fechaReserva;
    if (min !== null || max !== null) {
      filtered = filtered.filter(r => {
        const fecha = new Date(r.fechaReserva).getTime();
        if (min !== null && fecha < min) return false;
        if (max !== null && fecha > max) return false;
        return true;
      });
    }
  }

  // Filtro por seña (rango)
  if (params.seña) {
    const { min, max } = params.seña;
    if (min !== null || max !== null) {
      filtered = filtered.filter(r => {
        const sena = Number(r.seña) || 0;
        if (min !== null && sena < min) return false;
        if (max !== null && sena > max) return false;
        return true;
      });
    }
  }

  return filtered;
};
