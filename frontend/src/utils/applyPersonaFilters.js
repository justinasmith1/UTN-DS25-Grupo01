// ===================
// Lógica de filtrado para Personas
// ===================

/**
 * Aplica filtros a una lista de personas
 */
export const applyPersonaFilters = (personas, filters) => {
  if (!personas || !Array.isArray(personas)) {
    return [];
  }

  return personas.filter(persona => {
    // Búsqueda general
    if (filters.q) {
      const query = filters.q.toLowerCase();
      const searchFields = [
        persona.nombre,
        persona.apellido,
        persona.nombreCompleto,
        persona.cuil,
        persona.email,
        persona.telefono?.toString()
      ].filter(Boolean);

      const matchesSearch = searchFields.some(field => 
        field.toLowerCase().includes(query)
      );

      if (!matchesSearch) return false;
    }

    if (filters?.tipo === 'propietario' && !persona.esPropietario) {
      return false;
    }

    if (filters?.tipo === 'inquilino' && !persona.esInquilino) {
      return false;
    }

    // Filtro por tipo de identificador
    if (filters.tipoIdentificador) {
      if (persona.identificador !== filters.tipoIdentificador) {
        return false;
      }
    }

    // Filtro por rango de fechas de creación
    if (filters.fechaCreacion) {
      const { min, max } = filters.fechaCreacion;
      if (min || max) {
        const fechaCreacion = new Date(persona.createdAt);
        
        if (min) {
          const fechaMin = new Date(min);
          if (fechaCreacion < fechaMin) return false;
        }
        
        if (max) {
          const fechaMax = new Date(max);
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

/**
 * Aplica ordenamiento a una lista de personas
 */
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

/**
 * Aplica paginación a una lista de personas
 */
export const applyPersonaPagination = (personas, pagination) => {
  if (!personas || !Array.isArray(personas) || !pagination) {
    return personas;
  }

  const { page = 1, pageSize = 10 } = pagination;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return personas.slice(start, end);
};

/**
 * Aplica filtros, ordenamiento y paginación a una lista de personas
 */
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
