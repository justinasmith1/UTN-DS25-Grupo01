// src/components/FilterBar/utils/reservasChips.js
// Utilidades para formatear chips de filtros de reservas

// Función para formatear strings (quitar guiones bajos, capitalizar)
export const nice = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

// Función para formatear chips de reservas
export const reservasChipsFrom = (appliedFilters) => {
  const chips = [];

  // Búsqueda general
  if (appliedFilters.q) {
    chips.push({
      key: 'q',
      label: `"${appliedFilters.q}"`,
      value: appliedFilters.q,
      type: 'search'
    });
  }

  // Inmobiliaria
  if (appliedFilters.inmobiliaria) {
    const inmobiliaria = appliedFilters.inmobiliaria;
    if (Array.isArray(inmobiliaria) && inmobiliaria.length > 0) {
      inmobiliaria.forEach(id => {
        chips.push({
          key: `inmobiliaria-${id}`,
          label: `Inmobiliaria: ${nice(id)}`,
          value: id,
          type: 'multiSelect'
        });
      });
    } else if (typeof inmobiliaria === 'string' || typeof inmobiliaria === 'number') {
      chips.push({
        key: 'inmobiliaria',
        label: `Inmobiliaria: ${nice(inmobiliaria)}`,
        value: inmobiliaria,
        type: 'singleSelect'
      });
    }
  }

  // Calle
  if (appliedFilters.calle) {
    const calle = appliedFilters.calle;
    if (Array.isArray(calle) && calle.length > 0) {
      calle.forEach(c => {
        chips.push({
          key: `calle-${c}`,
          label: `Calle: ${nice(c)}`,
          value: c,
          type: 'multiSelect'
        });
      });
    } else if (typeof calle === 'string') {
      chips.push({
        key: 'calle',
        label: `Calle: ${nice(calle)}`,
        value: calle,
        type: 'singleSelect'
      });
    }
  }

  // Fecha de reserva (rango)
  if (appliedFilters.fechaReserva) {
    const { min, max } = appliedFilters.fechaReserva;
    if (min || max) {
      const minStr = min ? new Date(min).toLocaleDateString('es-AR') : '∞';
      const maxStr = max ? new Date(max).toLocaleDateString('es-AR') : '∞';
      chips.push({
        key: 'fechaReserva',
        label: `Fecha: ${minStr} - ${maxStr}`,
        value: { min, max },
        type: 'dateRange'
      });
    }
  }

  // Seña (rango)
  if (appliedFilters.seña) {
    const { min, max } = appliedFilters.seña;
    if (min !== null || max !== null) {
      const minStr = min !== null ? `$${min.toLocaleString('es-AR')}` : '∞';
      const maxStr = max !== null ? `$${max.toLocaleString('es-AR')}` : '∞';
      chips.push({
        key: 'seña',
        label: `Seña: ${minStr} - ${maxStr}`,
        value: { min, max },
        type: 'range'
      });
    }
  }

  return chips;
};
