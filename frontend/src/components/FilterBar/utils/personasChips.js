import { TIPOS_IDENTIFICADOR } from '../presets/personas.preset';

// ===================
// Utilidades para chips de filtros de Personas
// ===================

/**
 * Convierte los filtros de personas a chips para mostrar
 */
export const personasChipsFrom = (filters) => {
  const chips = [];

  // Búsqueda general
  if (filters.q) {
    chips.push({
      key: 'q',
      label: 'Búsqueda',
      value: filters.q,
      color: 'primary'
    });
  }

  // Tipo de identificador
  if (filters.tipoIdentificador) {
    const tipo = TIPOS_IDENTIFICADOR.find(t => t.value === filters.tipoIdentificador);
    chips.push({
      key: 'tipoIdentificador',
      label: 'Tipo ID',
      value: tipo ? tipo.label : filters.tipoIdentificador,
      color: 'info'
    });
  }


  // Rango de fechas
  if (filters.fechaCreacion) {
    const { min, max } = filters.fechaCreacion;
    if (min || max) {
      let fechaText = '';
      if (min && max) {
        fechaText = `${nice(min)} - ${nice(max)}`;
      } else if (min) {
        fechaText = `Desde ${nice(min)}`;
      } else if (max) {
        fechaText = `Hasta ${nice(max)}`;
      }
      
      chips.push({
        key: 'fechaCreacion',
        label: 'Fecha Creación',
        value: fechaText,
        color: 'secondary'
      });
    }
  }

  return chips;
};

/**
 * Formatea una fecha para mostrar en chips
 */
export const nice = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Obtiene el color del chip basado en el tipo de filtro
 */
export const getChipColor = (filterKey) => {
  const colors = {
    q: 'primary',
    tipoIdentificador: 'info',
    fechaCreacion: 'secondary'
  };
  
  return colors[filterKey] || 'secondary';
};

/**
 * Obtiene el ícono del chip basado en el tipo de filtro
 */
export const getChipIcon = (filterKey) => {
  const icons = {
    q: '🔍',
    tipoIdentificador: '🆔',
    fechaCreacion: '📅'
  };
  
  return icons[filterKey] || '🏷️';
};
