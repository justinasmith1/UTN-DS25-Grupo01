// ===================
// Lógica de filtrado para Personas (client-side)
// ===================

/**
 * Aplica filtros a una lista de personas (client-side)
 * Función pura que filtra el array localmente sin consultar al backend
 */
export const applyPersonaFilters = (personas, filters = {}) => {
  if (!personas || !Array.isArray(personas)) {
    return [];
  }

  return personas.filter(persona => {
    // Filtro por estado
    if (filters.estado) {
      if (persona.estado !== filters.estado) {
        return false;
      }
    }

    // Filtro por "cliente de" (puede elegir mas de una)
    if (filters.clienteDe && Array.isArray(filters.clienteDe) && filters.clienteDe.length > 0) {
      const personaInmobiliariaId = persona.inmobiliariaId 
        ? (typeof persona.inmobiliariaId === 'number' ? persona.inmobiliariaId : parseInt(String(persona.inmobiliariaId), 10))
        : null;
      
      // Verificar si la persona coincide con alguna de las selecciones
      const matches = filters.clienteDe.some(selected => {
        // Si es "FEDERALA" o "LA_FEDERALA"
        if (selected === 'FEDERALA') {
          return personaInmobiliariaId === null || personaInmobiliariaId === undefined;
        }
        
        // Es un ID de inmobiliaria (puede venir como número o string numérico)
        const inmobiliariaIdFilter = typeof selected === 'number' 
          ? selected 
          : parseInt(String(selected), 10);
        
        if (!isNaN(inmobiliariaIdFilter)) {
          return personaInmobiliariaId === inmobiliariaIdFilter;
        }
        
        return false;
      });
      
      if (!matches) {
        return false;
      }
    }

    // Filtro por tipo de identificador (soporta múltiples selecciones)
    if (filters.identificadorTipo && Array.isArray(filters.identificadorTipo) && filters.identificadorTipo.length > 0) {
      const tipoPersona = persona.identificadorTipo || persona.identificador;
      // Verificar si el tipo de la persona coincide con alguna de las selecciones
      const matches = filters.identificadorTipo.some(selected => tipoPersona === selected);
      if (!matches) {
        return false;
      }
    }

    // Filtro por rango de fechas de creación
    if (filters.fechaCreacion) {
      const { min, max } = filters.fechaCreacion;
      if (min || max) {
        const fechaCreacion = persona.createdAt ? new Date(persona.createdAt) : null;
        
        if (!fechaCreacion || isNaN(fechaCreacion.getTime())) {
          // Si no tiene fecha válida y se está filtrando por fecha no debería incluirse supuestamente
          return false;
        }
        
        if (min) {
          const fechaMin = new Date(min);
          if (fechaCreacion < fechaMin) return false;
        }
        
        if (max) {
          const fechaMax = new Date(max);
          // Incluir el día completo
          fechaMax.setHours(23, 59, 59, 999);
          if (fechaCreacion > fechaMax) return false;
        }
      }
    }

    return true;
  }).sort((a, b) => {
    // Ordenar por ID ascendente por defecto
    const idA = a?.id ?? 0;
    const idB = b?.id ?? 0;
    return idA - idB;
  });
};

/** Aplica ordenamiento a una lista de personas */
export const applyPersonaSorting = (personas, sort) => {
  if (!personas || !Array.isArray(personas) || !sort?.field) {
    return personas;
  }

  return [...personas].sort((a, b) => {
    let aVal = a[sort.field];
    let bVal = b[sort.field];

    // Casos especiales para campos compuestos
    if (sort.field === 'nombreCompleto') {
      aVal = `${a.nombre || ''} ${a.apellido || ''}`.trim();
      bVal = `${b.nombre || ''} ${b.apellido || ''}`.trim();
    } else if (sort.field === 'identificador') {
      aVal = a.identificador?.tipo || '';
      bVal = b.identificador?.tipo || '';
    } else if (sort.field === 'contacto') {
      aVal = a.email || a.telefono || '';
      bVal = b.email || b.telefono || '';
    }

    // Convertir a string para comparación si es necesario
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    // Manejar valores nulos/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sort.direction === 'asc' ? 1 : -1;
    if (bVal == null) return sort.direction === 'asc' ? -1 : 1;

    // Comparar valores
    if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });
};

/** Aplica paginación a una lista de personas */
export const applyPersonaPagination = (personas, pagination) => {
  if (!personas || !Array.isArray(personas) || !pagination) {
    return personas;
  }

  const { page = 1, pageSize = 10 } = pagination;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return personas.slice(start, end);
};

/** Aplica filtros, ordenamiento y paginación a una lista de personas */
export const applyPersonaFiltersAndPagination = (personas, filters, sort, pagination) => {
  let filtered = applyPersonaFilters(personas, filters);
  let sorted = applyPersonaSorting(filtered, sort);
  let paginated = applyPersonaPagination(sorted, pagination);

  return {
    data: paginated,
    total: filtered.length,
    page: pagination?.page || 1,
    pageSize: pagination?.pageSize || 10,
    totalPages: Math.ceil(filtered.length / (pagination?.pageSize || 10))
  };
};
