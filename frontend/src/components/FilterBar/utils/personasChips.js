import { TIPOS_IDENTIFICADOR, ESTADOS_PERSONA } from '../presets/personas.preset';

// ===================
// Utilidades para chips de filtros de Personas
// ===================

/**
 * Convierte los filtros de personas a chips para mostrar
 */
export const personasChipsFrom = (filters, catalogs = {}) => {
  const chips = [];

  // NO mostrar chip de búsqueda (el buscador ya es visible en la UI)
  // La búsqueda se maneja por separado y no necesita chip

  // Estado (solo Admin/Gestor) - NO mostrar si es "ALL" o "TODAS"
  // El chip muestra solo el valor seleccionado, no "Estado: ..."
  if (filters.estado && filters.estado !== 'ALL' && filters.estado !== 'TODAS') {
    const estado = ESTADOS_PERSONA.find(e => e.value === filters.estado);
    const displayValue = estado ? estado.label : filters.estado;
    chips.push({
      id: 'estado',
      k: 'estado',
      label: displayValue, // Mostrar solo el valor seleccionado
      value: displayValue,
      v: filters.estado,
      color: filters.estado === 'ACTIVA' ? 'success' : 'danger'
    });
  }

  // Cliente de (solo Admin/Gestor) - unificado (multiSelect)
  // El chip debe mostrar solo el valor seleccionado, no "Cliente de: ..."
  // Soporta múltiples selecciones: cada una genera su propio chip
  if (filters.clienteDe && Array.isArray(filters.clienteDe) && filters.clienteDe.length > 0) {
    filters.clienteDe.forEach(selected => {
      let displayValue = '';
      
      // Si es "FEDERALA" o "LA_FEDERALA"
      if (selected === 'FEDERALA' || selected === 'LA_FEDERALA') {
        displayValue = 'La Federala';
      } else {
        // Es un ID de inmobiliaria (número o string numérico)
        const inmobiliariaId = typeof selected === 'number' 
          ? selected 
          : parseInt(selected, 10);
        
        if (!isNaN(inmobiliariaId)) {
          // Buscar en el catálogo de inmobiliarias
          const inmobiliaria = catalogs?.clienteDe?.find(i => {
            const iId = typeof i.value === 'number' ? i.value : parseInt(i.value, 10);
            return iId === inmobiliariaId;
          });
          
          displayValue = inmobiliaria ? inmobiliaria.label : `Inmobiliaria ${inmobiliariaId}`;
        } else {
          displayValue = String(selected);
        }
      }
      
      // Cada selección genera su propio chip
      chips.push({
        id: `clienteDe-${selected}`,
        k: 'clienteDe',
        label: displayValue, // Mostrar solo el valor seleccionado
        value: displayValue,
        v: selected, // Valor individual para poder removerlo
        color: 'info'
      });
    });
  }

  // Tipo de identificador (multiSelect)
  // El chip muestra solo el valor seleccionado, no "Tipo ID: ..."
  // Soporta múltiples selecciones: cada una genera su propio chip
  if (filters.identificadorTipo && Array.isArray(filters.identificadorTipo) && filters.identificadorTipo.length > 0) {
    filters.identificadorTipo.forEach(selected => {
      const tipo = TIPOS_IDENTIFICADOR.find(t => t.value === selected);
      const displayValue = tipo ? tipo.label : selected;
      
      chips.push({
        id: `identificadorTipo-${selected}`,
        k: 'identificadorTipo',
        label: displayValue, // Mostrar solo el valor seleccionado (ej: "DNI", "CUIL")
        value: displayValue,
        v: selected, // Valor individual para poder removerlo
        color: 'warning'
      });
    });
  }

  // Rango de fechas
  // El chip muestra solo el rango de fechas, no "Fecha Creación: ..."
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
        id: 'fechaCreacion',
        k: 'fechaCreacion',
        label: fechaText, // Mostrar solo el rango de fechas
        value: fechaText,
        v: filters.fechaCreacion,
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

