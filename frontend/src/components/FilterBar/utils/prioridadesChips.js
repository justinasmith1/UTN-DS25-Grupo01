// src/components/FilterBar/utils/prioridadesChips.js
// Formateador de chips para filtros de Prioridades

export const prioridadesChipsFrom = (filters = {}, catalogs = {}) => {
  const chips = [];

  // Estado (multiSelect) - un chip por cada valor
  if (filters.estado && Array.isArray(filters.estado) && filters.estado.length > 0) {
    filters.estado.forEach(selected => {
      chips.push({
        id: `estado-${selected}`,
        k: 'estado',
        label: selected,
        value: selected,
        v: selected,
      });
    });
  }

  // Inmobiliaria (chips) - un chip por cada valor seleccionado
  if (filters.owner && Array.isArray(filters.owner) && filters.owner.length > 0) {
    filters.owner.forEach(own => {
      let displayValue = '';
      
      // Si es "La Federala" (string)
      if (typeof own === 'string' && own.toLowerCase().includes('federala')) {
        displayValue = 'La Federala';
      } else {
        // Es un ID de inmobiliaria (número o string numérico)
        const inmobiliariaId = typeof own === 'number' ? own : parseInt(own, 10);
        
        if (!isNaN(inmobiliariaId) && catalogs?.owner) {
          // Buscar en el catálogo de inmobiliarias (igual que personasChips)
          const inmobiliaria = catalogs.owner.find(i => {
            const iId = typeof i.value === 'number' ? i.value : parseInt(i.value, 10);
            return iId === inmobiliariaId;
          });
          
          displayValue = inmobiliaria ? inmobiliaria.label : `Inmobiliaria ${inmobiliariaId}`;
        } else {
          displayValue = String(own);
        }
      }
      
      // Cada selección genera su propio chip
      chips.push({
        id: `owner-${own}`,
        k: 'owner',
        label: displayValue,
        value: displayValue,
        v: own, // Valor original para removeChip
      });
    });
  }

  // Vencimiento (fechaFin)
  if (filters.fechaFin) {
    const { min, max } = filters.fechaFin || {};
    if (min || max) {
      const minStr = min ? new Date(min).toLocaleDateString('es-AR') : '';
      const maxStr = max ? new Date(max).toLocaleDateString('es-AR') : '';
      const rangeStr = min && max ? `${minStr} - ${maxStr}` : min ? `Desde ${minStr}` : `Hasta ${maxStr}`;
      chips.push({
        id: 'fechaFin',
        k: 'fechaFin',
        label: rangeStr,
        value: rangeStr,
        v: { min, max },
      });
    }
  }

  return chips;
};

export const nice = (val) => String(val || '').trim();
