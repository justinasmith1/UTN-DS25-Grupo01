import { http, normalizeApiListResponse } from '../http/http';

// ===================
// Mapeo de datos
// ===================

/**
 * Convierte datos del backend al formato del frontend
 */
export const fromApi = (apiPersona) => {
  if (!apiPersona) return null;

  return {
    id: apiPersona.idPersona,
    nombre: apiPersona.nombre || '',
    apellido: apiPersona.apellido || '',
    nombreCompleto: `${apiPersona.nombre || ''} ${apiPersona.apellido || ''}`.trim(),
    identificador: apiPersona.identificador || 'CUIL',
    telefono: apiPersona.telefono || null,
    email: apiPersona.email || null,
    cuil: apiPersona.cuil || '',
    createdAt: apiPersona.createdAt || new Date().toISOString()
  };
};

/**
 * Convierte datos del frontend al formato del backend
 */
export const toApi = (frontendPersona) => {
  if (!frontendPersona) return null;

  return {
    nombre: frontendPersona.nombre,
    apellido: frontendPersona.apellido,
    identificador: frontendPersona.identificador,
    telefono: frontendPersona.telefono,
    email: frontendPersona.email
  };
};

// ===================
// API Functions
// ===================

/**
 * Obtiene todas las personas
 */
export const getAllPersonas = async (params = {}) => {
  try {
    // Construir query string si hay parámetros
    const queryString = Object.keys(params).length > 0 
      ? '?' + new URLSearchParams(params).toString() 
      : '';
    
    const response = await http(`/personas${queryString}`, { method: 'GET' });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al cargar personas');
    }
    
    // Manejar diferentes estructuras de respuesta del backend
    let personasData = [];
    let total = 0;

    if (data) {
      if (data.personas) {
        personasData = data.personas;
        total = data.total || personasData.length;
      } else if (Array.isArray(data)) {
        personasData = data;
        total = personasData.length;
      }
    }

    return {
      personas: personasData.map(fromApi),
      total
    };
  } catch (error) {
    console.error('Error al obtener personas:', error);
    throw error;
  }
};

/**
 * Obtiene una persona por ID
 */
export const getPersona = async (id) => {
  try {
    const response = await http(`/personas/${id}`, { method: 'GET' });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al cargar persona');
    }
    
    return fromApi(data.persona);
  } catch (error) {
    console.error(`Error al obtener persona ${id}:`, error);
    throw error;
  }
};

/**
 * Obtiene una persona por CUIL
 */
export const getPersonaByCuil = async (cuil) => {
  try {
    const response = await http(`/personas/cuil/${cuil}`, { method: 'GET' });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al cargar persona por CUIL');
    }
    
    return fromApi(data.persona);
  } catch (error) {
    console.error(`Error al obtener persona por CUIL ${cuil}:`, error);
    throw error;
  }
};

/**
 * Crea una nueva persona
 */
export const createPersona = async (personaData) => {
  try {
    const apiData = toApi(personaData);
    const response = await http('/personas', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData)
    });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al crear persona');
    }
    
    return fromApi(data.persona);
  } catch (error) {
    console.error('Error al crear persona:', error);
    throw error;
  }
};

/**
 * Actualiza una persona existente
 */
export const updatePersona = async (id, personaData) => {
  try {
    const apiData = toApi(personaData);
    const response = await http(`/personas/${id}`, { 
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData)
    });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al actualizar persona');
    }
    
    return fromApi(data.persona);
  } catch (error) {
    console.error(`Error al actualizar persona ${id}:`, error);
    throw error;
  }
};

/**
 * Elimina una persona
 */
export const deletePersona = async (id) => {
  try {
    const response = await http(`/personas/${id}`, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al eliminar persona');
    }
    
    return data;
  } catch (error) {
    console.error(`Error al eliminar persona ${id}:`, error);
    throw error;
  }
};

/**
 * Función estándar para listar con filtros, ordenamiento y paginación
 */
export const list = async (params = {}) => {
  try {
    // Construir query string si hay parámetros
    const queryString = Object.keys(params).length > 0 
      ? '?' + new URLSearchParams(params).toString() 
      : '';
    
    const response = await http(`/personas${queryString}`, { method: 'GET' });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al listar personas');
    }
    
    return normalizeApiListResponse(data, fromApi);
  } catch (error) {
    console.error('Error al listar personas:', error);
    throw error;
  }
};

// ===================
// Mock Data (para desarrollo)
// ===================

const mockPersonas = [
  {
    idPersona: 1,
    nombre: 'Juan',
    apellido: 'Pérez',
    identificador: 'DNI',
    cuil: '12345678',
    telefono: 1123456789,
    email: 'juan.perez@email.com',
    contacto: 'juan.perez@email.com,1123456789',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    idPersona: 2,
    nombre: 'María',
    apellido: 'González',
    identificador: 'CUIT',
    cuil: '20-12345678-9',
    telefono: 1198765432,
    email: 'maria.gonzalez@email.com',
    contacto: 'maria.gonzalez@email.com,1198765432',
    createdAt: '2024-01-20T14:15:00Z'
  },
  {
    idPersona: 3,
    nombre: 'Carlos',
    apellido: 'López',
    identificador: 'CUIL',
    cuil: '27-87654321-0',
    telefono: 1156789012,
    email: null,
    contacto: '1156789012',
    createdAt: '2024-02-01T09:45:00Z'
  },
  {
    idPersona: 4,
    nombre: 'Ana',
    apellido: 'Martínez',
    identificador: 'Pasaporte',
    cuil: 'AB123456',
    telefono: null,
    email: 'ana.martinez@email.com',
    contacto: 'ana.martinez@email.com',
    createdAt: '2024-02-10T16:20:00Z'
  }
];

/**
 * Función mock para desarrollo
 */
export const mockFilterSortPage = (personas, filters = {}, sort = {}, pagination = {}) => {
  let filtered = [...personas];

  // Aplicar filtros
  if (filters.q) {
    const query = filters.q.toLowerCase();
    filtered = filtered.filter(persona => 
      persona.nombre.toLowerCase().includes(query) ||
      persona.apellido.toLowerCase().includes(query) ||
      persona.cuil.toLowerCase().includes(query) ||
      (persona.email && persona.email.toLowerCase().includes(query)) ||
      (persona.telefono && persona.telefono.toString().includes(query))
    );
  }

  if (filters.tipoIdentificador) {
    filtered = filtered.filter(persona => persona.identificador === filters.tipoIdentificador);
  }

  if (filters.tieneEmail !== undefined) {
    filtered = filtered.filter(persona => !!persona.email === filters.tieneEmail);
  }

  if (filters.tieneTelefono !== undefined) {
    filtered = filtered.filter(persona => !!persona.telefono === filters.tieneTelefono);
  }

  if (filters.fechaCreacion) {
    const { min, max } = filters.fechaCreacion;
    filtered = filtered.filter(persona => {
      const fecha = new Date(persona.createdAt);
      return (!min || fecha >= new Date(min)) && (!max || fecha <= new Date(max));
    });
  }

  // Aplicar ordenamiento
  if (sort.field) {
    filtered.sort((a, b) => {
      let aVal = a[sort.field];
      let bVal = b[sort.field];

      if (sort.field === 'nombreCompleto') {
        aVal = `${a.nombre} ${a.apellido}`;
        bVal = `${b.nombre} ${b.apellido}`;
      }

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sort.direction === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
  }

  // Aplicar paginación
  const total = filtered.length;
  const page = pagination.page || 1;
  const pageSize = pagination.pageSize || 10;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: filtered.slice(start, end),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
};

// Variable para controlar el uso de mock
const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";

// Exportar funciones con mock condicional
export const getAllPersonasWithMock = async (params = {}) => {
  if (USE_MOCK) {
    const result = mockFilterSortPage(mockPersonas, params.filters, params.sort, params.pagination);
    return {
      personas: result.data.map(fromApi),
      total: result.total
    };
  }
  return getAllPersonas(params);
};