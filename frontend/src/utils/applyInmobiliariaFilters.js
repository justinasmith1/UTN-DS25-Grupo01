// src/utils/applyInmobiliariaFilters.js
// Función para aplicar filtros localmente a los datos de inmobiliarias

// Funciones auxiliares para extraer valores de los objetos
const getNombre = (inmobiliaria) => inmobiliaria?.nombre || '';
const getRazonSocial = (inmobiliaria) => inmobiliaria?.razonSocial || '';
const getContacto = (inmobiliaria) => inmobiliaria?.contacto || '';
const getComxventa = (inmobiliaria) => Number(inmobiliaria?.comxventa) || 0;
const getCantidadVentas = (inmobiliaria) => Number(inmobiliaria?.cantidadVentas) || 0;
const getEstado = (inmobiliaria) => inmobiliaria?.estado || 'OPERATIVO';
const getCreatedAt = (inmobiliaria) => {
  const date = inmobiliaria?.createdAt;
  return date ? new Date(date).getTime() : 0;
};

// Función para verificar si un valor está en un rango
const inRange = (val, min, max) => {
  const v = Number.isFinite(val) ? val : NaN;
  if (Number.isNaN(v)) return false;
  if (min !== undefined && min !== null && v < +min) return false;
  if (max !== undefined && max !== null && v > +max) return false;
  return true;
};

export function applyInmobiliariaFilters(inmobiliarias, params) {
  if (!Array.isArray(inmobiliarias)) return [];
  if (!params || Object.keys(params).length === 0) return inmobiliarias;

  let rows = [...inmobiliarias];

  // Filtro de estado - multiSelect pattern (siguiendo FilterBarVentas)
  // Si estado está vacío o undefined, mostrar solo OPERATIVAS
  // Si tiene valores, filtrar por esos estados
  if (params.estado && Array.isArray(params.estado) && params.estado.length > 0) {
    rows = rows.filter((inmobiliaria) =>
      params.estado.includes(getEstado(inmobiliaria))
    );
  } else {
    // Por defecto, mostrar solo inmobiliarias OPERATIVAS
    rows = rows.filter((inmobiliaria) => getEstado(inmobiliaria) === 'OPERATIVO');
  }


  // Filtro de búsqueda general
  if (params.q) {
    const query = params.q.toLowerCase();
    rows = rows.filter((inmobiliaria) => {
      const searchableText = [
        String(inmobiliaria.id || ''),
        getNombre(inmobiliaria),
        getRazonSocial(inmobiliaria),
        getContacto(inmobiliaria),
      ].join(' ').toLowerCase();

      return searchableText.includes(query);
    });
  }

  // Filtros de selección múltiple
  if (params.nombre && Array.isArray(params.nombre) && params.nombre.length > 0) {
    rows = rows.filter((inmobiliaria) =>
      params.nombre.includes(getNombre(inmobiliaria))
    );
  }

  if (params.razonSocial && Array.isArray(params.razonSocial) && params.razonSocial.length > 0) {
    rows = rows.filter((inmobiliaria) =>
      params.razonSocial.includes(getRazonSocial(inmobiliaria))
    );
  }

  if (params.contacto && Array.isArray(params.contacto) && params.contacto.length > 0) {
    rows = rows.filter((inmobiliaria) =>
      params.contacto.includes(getContacto(inmobiliaria))
    );
  }

  // Filtros de rango - solo aplicar si hay valores válidos (no null)
  if ((params.comxventa?.min !== undefined && params.comxventa?.min !== null) ||
    (params.comxventa?.max !== undefined && params.comxventa?.max !== null)) {
    rows = rows.filter((inmobiliaria) =>
      inRange(getComxventa(inmobiliaria), params.comxventa?.min, params.comxventa?.max)
    );
  }

  if ((params.cantidadVentas?.min !== undefined && params.cantidadVentas?.min !== null) ||
    (params.cantidadVentas?.max !== undefined && params.cantidadVentas?.max !== null)) {
    rows = rows.filter((inmobiliaria) =>
      inRange(getCantidadVentas(inmobiliaria), params.cantidadVentas?.min, params.cantidadVentas?.max)
    );
  }

  if ((params.createdAt?.min !== undefined && params.createdAt?.min !== null) ||
    (params.createdAt?.max !== undefined && params.createdAt?.max !== null)) {
    rows = rows.filter((inmobiliaria) =>
      inRange(getCreatedAt(inmobiliaria), params.createdAt?.min, params.createdAt?.max)
    );
  }

  return rows;
}
