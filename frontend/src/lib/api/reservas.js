// src/lib/api/reservas.js
// API adapter para reservas
 
const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http, normalizeApiListResponse } from "../http/http";

// ===== NORMALIZADORES =====
const fromApi = (row = {}) => ({
  id: row.id ?? row.idReserva ?? row.reservaId ?? row.Id,
  loteId: row.loteId ?? row.lote?.id ?? row.lote?.idLote ?? row.loteId,
  clienteId: row.clienteId ?? row.cliente?.id ?? row.cliente?.idPersona ?? row.clienteId,
  clienteNombre: row.cliente?.nombre ?? row.clienteNombre ?? '',
  clienteApellido: row.cliente?.apellido ?? row.clienteApellido ?? '',
  clienteCompleto: row.cliente?.nombreCompleto || 
    `${row.cliente?.nombre || ''} ${row.cliente?.apellido || ''}`.trim() || 
    `${row.clienteNombre || ''} ${row.clienteApellido || ''}`.trim() || 
    `Cliente ID: ${row.clienteId || 'N/A'}`,
  fechaReserva: row.fechaReserva ?? row.fecha ?? row.createdAt,
  seña: row.seña ?? row.sena ?? row.signal ?? row.amount,
  inmobiliariaId: row.inmobiliariaId ?? row.inmobiliaria?.id ?? row.inmobiliaria?.idInmobiliaria,
  inmobiliariaNombre: row.inmobiliaria?.nombre ?? row.inmobiliariaNombre ?? 
    `Inmobiliaria ID: ${row.inmobiliariaId || 'N/A'}`,
  loteInfo: row.lote ? {
    fraccion: row.lote.fraccion ?? row.lote.numero ?? '',
    calle: row.lote.ubicacion?.calle ?? row.lote.calle ?? '',
    numero: row.lote.ubicacion?.numero ?? row.lote.numero ?? '',
    estado: row.lote.estado ?? '',
    precio: row.lote.precio ?? row.lote.valor ?? 0
  } : {
    fraccion: `Lote ID: ${row.loteId || 'N/A'}`,
    calle: '',
    numero: '',
    estado: '',
    precio: 0
  },
  createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  updateAt: row.updateAt ?? row.updated_at ?? row.updatedAt
});

const toApi = (data = {}) => ({
  loteId: data.loteId,
  clienteId: data.clienteId,
  fechaReserva: data.fechaReserva,
  seña: data.seña,
  inmobiliariaId: data.inmobiliariaId
});

// ===== MOCK DATA =====
const mockReservas = [
  {
    id: 1,
    loteId: 1,
    clienteId: 1,
    cliente: { id: 1, nombre: 'Juan', apellido: 'Pérez', nombreCompleto: 'Juan Pérez' },
    fechaReserva: '2024-01-15T10:00:00Z',
    seña: 50000,
    inmobiliariaId: 1,
    inmobiliaria: { id: 1, nombre: 'Inmobiliaria Central' },
    lote: {
      id: 1,
      fraccion: 1,
      ubicacion: { calle: 'REINAMORA', numero: 123 },
      estado: 'RESERVADO',
      precio: 250000
    },
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    loteId: 2,
    clienteId: 2,
    cliente: { id: 2, nombre: 'María', apellido: 'González', nombreCompleto: 'María González' },
    fechaReserva: '2024-01-20T14:30:00Z',
    seña: 75000,
    inmobiliariaId: 2,
    inmobiliaria: { id: 2, nombre: 'Propiedades del Sur' },
    lote: {
      id: 2,
      fraccion: 2,
      ubicacion: { calle: 'MACA', numero: 456 },
      estado: 'RESERVADO',
      precio: 300000
    },
    createdAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 3,
    loteId: 3,
    clienteId: 3,
    cliente: { id: 3, nombre: 'Carlos', apellido: 'López', nombreCompleto: 'Carlos López' },
    fechaReserva: '2024-02-01T09:15:00Z',
    seña: 60000,
    inmobiliariaId: 1,
    inmobiliaria: { id: 1, nombre: 'Inmobiliaria Central' },
    lote: {
      id: 3,
      fraccion: 3,
      ubicacion: { calle: 'ZORZAL', numero: 789 },
      estado: 'RESERVADO',
      precio: 280000
    },
    createdAt: '2024-02-01T09:15:00Z'
  }
];

// ===== FUNCIONES DE API =====
export const getAllReservas = async (params = {}) => {
  if (USE_MOCK) {
    console.log('🔍 [MOCK] Obteniendo reservas...', params);
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const filtered = mockFilterSortPage(mockReservas, params);
    
    return {
      success: true,
      data: filtered.data,
      total: filtered.total,
      message: 'Reservas obtenidas correctamente (MOCK)'
    };
  }

  try {
    // Construir query string
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    const url = `/reservas${queryString ? `?${queryString}` : ''}`;
    
    const response = await http(url, {
      method: 'GET'
    });
    
    // Si response es un objeto Response de fetch, necesitamos parsear el JSON
    let data;
    if (response && typeof response === 'object' && response.json) {
      // Es un objeto Response de fetch
      data = await response.json();
    } else {
      // Ya son los datos parseados
      data = response;
    }

    // Manejar diferentes estructuras de respuesta
    let reservasData = [];
    let total = 0;

    if (data && typeof data === 'object') {
      // Si data tiene una propiedad data
      if (data.data !== undefined) {
        if (Array.isArray(data.data)) {
          reservasData = data.data;
          total = data.data.length;
        } else if (data.data.reservas && Array.isArray(data.data.reservas)) {
          reservasData = data.data.reservas;
          total = data.data.reservas.length;
        }
      }
      // Si data tiene una propiedad reservas
      else if (data.reservas && Array.isArray(data.reservas)) {
        reservasData = data.reservas;
        total = data.reservas.length;
      }
      // Si data es directamente un array
      else if (Array.isArray(data)) {
        reservasData = data;
        total = data.length;
      }
      // Si data tiene propiedades pero no las esperadas, buscar arrays anidados
      else {
        const possibleArrays = Object.values(data).filter(val => Array.isArray(val));
        if (possibleArrays.length > 0) {
          reservasData = possibleArrays[0];
          total = possibleArrays[0].length;
        }
      }
    }

    return {
      success: true,
      data: reservasData,
      total: total,
      message: response.message || 'Reservas obtenidas correctamente'
    };
  } catch (error) {
    console.error('❌ Error obteniendo reservas:', error);
    return {
      success: false,
      data: [],
      total: 0,
      message: error.message || 'Error al obtener reservas'
    };
  }
};

export const getReserva = async (id) => {
  if (USE_MOCK) {
    const reserva = mockReservas.find(r => r.id === parseInt(id));
    return {
      success: true,
      data: reserva || null,
      message: reserva ? 'Reserva encontrada (MOCK)' : 'Reserva no encontrada (MOCK)'
    };
  }

  try {
    const response = await http(`/reservas/${id}`, {
      method: 'GET'
    });

    return {
      success: true,
      data: response.data || response.reserva,
      message: response.message || 'Reserva obtenida correctamente'
    };
  } catch (error) {
    console.error('❌ Error obteniendo reserva:', error);
    return {
      success: false,
      data: null,
      message: error.message || 'Error al obtener reserva'
    };
  }
};

export const createReserva = async (data) => {
  if (USE_MOCK) {
    const newReserva = {
      id: mockReservas.length + 1,
      ...data,
      createdAt: new Date().toISOString()
    };
    mockReservas.push(newReserva);
    return {
      success: true,
      data: newReserva,
      message: 'Reserva creada correctamente (MOCK)'
    };
  }

  try {
    const response = await http('/reservas', {
      method: 'POST',
      body: JSON.stringify(toApi(data))
    });

    return {
      success: true,
      data: response.data || response.reserva,
      message: response.message || 'Reserva creada correctamente'
    };
  } catch (error) {
    console.error('❌ Error creando reserva:', error);
    return {
      success: false,
      data: null,
      message: error.message || 'Error al crear reserva'
    };
  }
};

export const updateReserva = async (id, data) => {
  if (USE_MOCK) {
    const index = mockReservas.findIndex(r => r.id === parseInt(id));
    if (index !== -1) {
      mockReservas[index] = { ...mockReservas[index], ...data, updateAt: new Date().toISOString() };
      return {
        success: true,
        data: mockReservas[index],
        message: 'Reserva actualizada correctamente (MOCK)'
      };
    }
    return {
      success: false,
      data: null,
      message: 'Reserva no encontrada (MOCK)'
    };
  }

  try {
    const response = await http(`/reservas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toApi(data))
    });

    return {
      success: true,
      data: response.data || response.reserva,
      message: response.message || 'Reserva actualizada correctamente'
    };
  } catch (error) {
    console.error('❌ Error actualizando reserva:', error);
    return {
      success: false,
      data: null,
      message: error.message || 'Error al actualizar reserva'
    };
  }
};

export const deleteReserva = async (id) => {
  if (USE_MOCK) {
    const index = mockReservas.findIndex(r => r.id === parseInt(id));
    if (index !== -1) {
      mockReservas.splice(index, 1);
      return {
        success: true,
        message: 'Reserva eliminada correctamente (MOCK)'
      };
    }
    return {
      success: false,
      message: 'Reserva no encontrada (MOCK)'
    };
  }

  try {
    const response = await http(`/reservas/${id}`, {
      method: 'DELETE'
    });

    return {
      success: true,
      message: response.message || 'Reserva eliminada correctamente'
    };
  } catch (error) {
    console.error('❌ Error eliminando reserva:', error);
    return {
      success: false,
      message: error.message || 'Error al eliminar reserva'
    };
  }
};

// ===== UTILIDADES =====
const mockFilterSortPage = (data, params = {}) => {
  let filtered = [...data];

  // Filtros
  if (params.q) {
    const query = params.q.toLowerCase();
    filtered = filtered.filter(r => 
      r.cliente?.nombreCompleto?.toLowerCase().includes(query) ||
      r.cliente?.nombre?.toLowerCase().includes(query) ||
      r.cliente?.apellido?.toLowerCase().includes(query) ||
      r.inmobiliaria?.nombre?.toLowerCase().includes(query) ||
      r.lote?.ubicacion?.calle?.toLowerCase().includes(query) ||
      String(r.lote?.ubicacion?.numero).includes(query) ||
      String(r.lote?.fraccion).includes(query)
    );
  }

  if (params.inmobiliaria) {
    filtered = filtered.filter(r => r.inmobiliariaId === parseInt(params.inmobiliaria));
  }

  if (params.fechaReserva?.min || params.fechaReserva?.max) {
    filtered = filtered.filter(r => {
      const fecha = new Date(r.fechaReserva);
      if (params.fechaReserva.min && fecha < new Date(params.fechaReserva.min)) return false;
      if (params.fechaReserva.max && fecha > new Date(params.fechaReserva.max)) return false;
      return true;
    });
  }

  if (params.seña?.min || params.seña?.max) {
    filtered = filtered.filter(r => {
      const sena = Number(r.seña);
      if (params.seña.min && sena < Number(params.seña.min)) return false;
      if (params.seña.max && sena > Number(params.seña.max)) return false;
      return true;
    });
  }

  // Ordenamiento
  if (params.sortBy) {
    filtered.sort((a, b) => {
      const aVal = a[params.sortBy];
      const bVal = b[params.sortBy];
      const direction = params.sortDir === 'desc' ? -1 : 1;
      
      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });
  }

  // Paginación
  const page = parseInt(params.page) || 1;
  const pageSize = parseInt(params.pageSize) || 25;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: filtered.slice(start, end),
    total: filtered.length
  };
};

// ===== NORMALIZADOR DE RESPUESTA =====
// Usando la función normalizeApiListResponse importada desde http/http

// ===== FUNCIÓN LIST ESTÁNDAR =====
export const list = async (params = {}) => {
  const result = await getAllReservas(params);
  
  if (!result.success) {
    throw new Error(result.message || 'Error al obtener reservas');
  }

  return {
    data: result.data,
    meta: {
      total: result.total,
      page: params.page || 1,
      pageSize: params.pageSize || 25
    }
  };
};

export { fromApi, toApi };