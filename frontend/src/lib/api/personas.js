import { http, normalizeApiListResponse } from '../http/http';

// ===================
// Mapeo de datos
// ===================

/**
 * Convierte datos del backend al formato del frontend
 */
export const fromApi = (apiPersona) => {
  if (!apiPersona) return null;

  // DisplayName: razonSocial o nombre+apellido
  const displayName = apiPersona.razonSocial 
    ? apiPersona.razonSocial 
    : `${apiPersona.nombre || ''} ${apiPersona.apellido || ''}`.trim();

  // Identificador: usar identificadorTipo e identificadorValor (nuevo) o fallback a legacy
  const identificadorTipo = apiPersona.identificadorTipo || apiPersona.identificador || 'CUIL';
  const identificadorValor = apiPersona.identificadorValor || apiPersona.cuil || '';

  return {
    id: apiPersona.idPersona,
    nombre: apiPersona.nombre || '',
    apellido: apiPersona.apellido || '',
    razonSocial: apiPersona.razonSocial || '',
    nombreCompleto: displayName,
    displayName: displayName,
    identificador: identificadorTipo,
    identificadorTipo: identificadorTipo,
    identificadorValor: identificadorValor,
    telefono: apiPersona.telefono || null,
    email: apiPersona.email || null, // Campo propio de Persona
    contacto: apiPersona.contacto || null,
    cuil: apiPersona.cuil || identificadorValor, // Legacy
    estado: apiPersona.estado || 'OPERATIVO',
    createdAt: apiPersona.createdAt || null,
    esPropietario: Boolean(apiPersona.esPropietario),
    esInquilino: Boolean(apiPersona.esInquilino),
    inmobiliariaId: apiPersona.inmobiliariaId || null,
    inmobiliaria: apiPersona.inmobiliaria || null,
    jefeDeFamilia: apiPersona.jefeDeFamilia || null,
    miembrosFamilia: apiPersona.miembrosFamilia || [],
    esJefeDeFamilia: Boolean(apiPersona.esJefeDeFamilia),
    _count: apiPersona._count || { lotesPropios: 0, lotesAlquilados: 0, Reserva: 0, Venta: 0 },
    // Arrays mínimos para mini detalles
    lotesPropios: apiPersona.lotesPropios || [],
    lotesAlquilados: apiPersona.lotesAlquilados || [],
    reservas: apiPersona.reservas || [],
    ventas: apiPersona.ventas || [],
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
    const queryParams = new URLSearchParams();
    
    // Parámetros básicos
    if (params.view) {
      queryParams.append('view', params.view);
    }
    // q (búsqueda) ya NO se envía al backend - se maneja 100% en frontend
    if (params.includeInactive === true || params.includeInactive === 'true') {
      queryParams.append('includeInactive', 'true');
    }
    if (params.limit) {
      queryParams.append('limit', params.limit.toString());
    }
    
    // Nuevos filtros
    if (params.estado) {
      queryParams.append('estado', params.estado);
    }
    if (params.clienteDe) {
      queryParams.append('clienteDe', params.clienteDe);
    }
    if (params.inmobiliariaId) {
      queryParams.append('inmobiliariaId', String(params.inmobiliariaId));
    }
    if (params.identificadorTipo) {
      queryParams.append('identificadorTipo', params.identificadorTipo);
    }
    if (params.createdFrom) {
      queryParams.append('createdFrom', params.createdFrom);
    }
    if (params.createdTo) {
      queryParams.append('createdTo', params.createdTo);
    }
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    
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
    const body = {
      identificadorTipo: personaData.identificadorTipo,
      identificadorValor: personaData.identificadorValor || "",
      ...(personaData.nombre ? { nombre: personaData.nombre.trim() } : {}),
      ...(personaData.apellido ? { apellido: personaData.apellido.trim() } : {}),
      ...(personaData.razonSocial ? { razonSocial: personaData.razonSocial.trim() } : {}),
      ...(personaData.telefono !== null && personaData.telefono !== undefined ? { telefono: personaData.telefono } : {}),
      ...(personaData.email && personaData.email.trim ? { email: personaData.email.trim() } : (personaData.email ? { email: personaData.email } : {}))
    };
    
    // inmobiliariaId: solo para Admin/Gestor
    if (personaData.inmobiliariaId !== undefined) {
      body.inmobiliariaId = personaData.inmobiliariaId;
    }

    const response = await http('/personas', { 
      method: 'POST',
      body
    });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const errorMsg = data?.message || data?.errors?.[0]?.message || 'Error al crear persona';
      throw new Error(errorMsg);
    }
    
    return fromApi(data.persona || data);
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
    // Construir body limpio (sin undefined)
    // http() hace JSON.stringify internamente, no lo hagamos aquí
    const body = {};
    
    if (personaData.identificadorTipo && personaData.identificadorValor) {
      body.identificadorTipo = personaData.identificadorTipo;
      body.identificadorValor = personaData.identificadorValor.trim();
    }
    
    if (personaData.nombre !== undefined) {
      body.nombre = personaData.nombre?.trim() || '';
    }
    
    if (personaData.apellido !== undefined) {
      body.apellido = personaData.apellido?.trim() || '';
    }
    
    if (personaData.razonSocial !== undefined) {
      body.razonSocial = personaData.razonSocial?.trim() || null;
    }
    
    if (personaData.telefono !== undefined) {
      body.telefono = personaData.telefono;
    }
    
    if (personaData.email !== undefined) {
      body.email = personaData.email === null ? null : (personaData.email.trim() || null);
    }
    
    if (personaData.estado !== undefined) {
      body.estado = personaData.estado;
    }
    
    if (personaData.inmobiliariaId !== undefined) {
      body.inmobiliariaId = personaData.inmobiliariaId;
    }

    // Usar http que devuelve Response, luego parsear JSON de manera segura
    // Este patrón es el mismo que usan reservas.js y lotes.js
    const res = await http(`/personas/${id}`, { 
      method: 'PUT',
      body: body  // http() hace JSON.stringify internamente
    });
    
    // Parsear el JSON de manera segura con .catch() para evitar errores si no es JSON válido
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      // Si hay error, extraer el mensaje de manera segura
      const errorMsg = data?.message || data?.errors?.[0]?.message || `Error al actualizar persona (${res.status})`;
      const error = new Error(errorMsg);
      error.status = res.status;
      error.data = data;
      throw error;
    }
    
    // El backend puede devolver { persona: {...} } o { data: { persona: {...} } } o directamente el objeto
    const raw = data?.persona ?? data?.data?.persona ?? data?.data ?? data;
    
    return fromApi(raw);
  } catch (error) {
    console.error(`Error al actualizar persona ${id}:`, error);
    // Si el error ya tiene status, re-lanzarlo
    if (error.status) {
      throw error;
    }
    // Si no, crear un error genérico
    const newError = new Error(error.message || 'Error al actualizar persona');
    newError.status = error.status || 500;
    throw newError;
  }
};

/**
 * Desactiva una persona (soft delete)
 */
export const desactivarPersona = async (id) => {
  try {
    const response = await http(`/personas/${id}/desactivar`, { method: 'PATCH' });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al desactivar persona');
    }
    
    return data;
  } catch (error) {
    console.error(`Error al desactivar persona ${id}:`, error);
    throw error;
  }
};

/**
 * Reactiva una persona
 */
export const reactivarPersona = async (id) => {
  try {
    const response = await http(`/personas/${id}/reactivar`, { method: 'PATCH' });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al reactivar persona');
    }
    
    return fromApi(data?.persona || data);
  } catch (error) {
    console.error(`Error al reactivar persona ${id}:`, error);
    throw error;
  }
};

/**
 * Elimina una persona definitivamente (hard delete) - solo Admin, solo si no tiene asociaciones
 */
export const deletePersonaDefinitivo = async (id) => {
  try {
    const response = await http(`/personas/${id}`, { method: 'DELETE' });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const error = new Error(data?.message || 'Error al eliminar persona definitivamente');
      error.status = response.status;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Error al eliminar persona ${id}:`, error);
    throw error;
  }
};

/**
 * Elimina una persona (por compatibilidad, ahora llama a desactivar)
 */
export const deletePersona = async (id) => {
  return desactivarPersona(id);
};

/**
 * Obtener grupo familiar de una persona
 */
export const getGrupoFamiliar = async (personaId) => {
  try {
    const response = await http(`/personas/${personaId}/grupo-familiar`, { method: 'GET' });
    
    // Manejar respuestas vacías (204 No Content)
    if (response.status === 204 || !response.headers.get('content-type')?.includes('application/json')) {
      return { titular: null, miembros: [] };
    }
    
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al obtener grupo familiar');
    }
    
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Error al parsear respuesta JSON de grupo familiar:`, error);
      throw new Error('Respuesta inválida del servidor');
    }
    console.error(`Error al obtener grupo familiar de persona ${personaId}:`, error);
    throw error;
  }
};

/**
 * Crear miembro familiar
 */
export const crearMiembroFamiliar = async (titularId, miembroData) => {
  try {
    const response = await http(`/personas/${titularId}/grupo-familiar/miembros`, {
      method: 'POST',
      body: {
        nombre: miembroData.nombre.trim(),
        apellido: miembroData.apellido.trim(),
        identificadorTipo: miembroData.identificadorTipo,
        identificadorValor: miembroData.identificadorValor.trim(),
      }
    });
    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al crear miembro familiar');
    }
    
    return data.miembro || data;
  } catch (error) {
    console.error(`Error al crear miembro familiar:`, error);
    throw error;
  }
};

/**
 * Eliminar miembro familiar
 */
export const eliminarMiembroFamiliar = async (titularId, miembroId) => {
  try {
    const response = await http(`/personas/${titularId}/grupo-familiar/miembros/${miembroId}`, {
      method: 'DELETE'
    });
    
    // Manejar respuestas vacías (204 No Content es común en DELETE)
    if (response.status === 204) {
      return { success: true };
    }
    
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return { success: response.ok };
    }
    
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    
    if (!response.ok) {
      throw new Error(data?.message || 'Error al eliminar miembro familiar');
    }
    
    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Error al parsear respuesta JSON al eliminar miembro familiar:`, error);
      throw new Error('Respuesta inválida del servidor');
    }
    console.error(`Error al eliminar miembro familiar:`, error);
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
    createdAt: '2024-01-15T10:30:00Z',
    esPropietario: true,
    esInquilino: false,
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
    createdAt: '2024-01-20T14:15:00Z',
    esPropietario: false,
    esInquilino: true,
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
    createdAt: '2024-02-01T09:45:00Z',
    esPropietario: false,
    esInquilino: false,
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
    createdAt: '2024-02-10T16:20:00Z',
    esPropietario: true,
    esInquilino: false,
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
      (persona.idPersona != null && persona.idPersona.toString().includes(query)) ||
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

  if (filters.tipo === 'propietario') {
    filtered = filtered.filter(persona => persona.esPropietario);
  } else if (filters.tipo === 'inquilino') {
    filtered = filtered.filter(persona => persona.esInquilino);
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






