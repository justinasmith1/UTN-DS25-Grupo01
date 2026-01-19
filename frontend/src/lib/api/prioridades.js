// src/lib/api/prioridades.js
// API adapter para prioridades

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http, httpJson } from "../http/http";

// ===== NORMALIZADORES =====
const fromApi = (row = {}) => {
  return {
    id: row.id ?? null,
    numero: row.numero ?? (row.id ? `PRI-${String(row.id).padStart(6, '0')}` : null), // Usar numero del backend, fallback a formato si no existe
    loteId: row.loteId ?? row.lote?.id ?? null,
    lote: row.lote || null,
    estado: row.estado ?? null,
    ownerType: row.ownerType ?? null,
    inmobiliariaId: row.inmobiliariaId ?? null,
    inmobiliaria: row.inmobiliaria || null,
    inmobiliariaNombre: row.inmobiliaria?.nombre ?? (row.ownerType === 'CCLF' ? 'La Federala' : null),
    fechaInicio: row.fechaInicio ?? null,
    fechaFin: row.fechaFin ?? null,
    loteEstadoAlCrear: row.loteEstadoAlCrear ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
  };
};

const toApi = (data = {}) => ({
  numero: data.numero ? String(data.numero).trim() : undefined,
  loteId: data.loteId,
  fechaInicio: data.fechaInicio, // ISO string
  fechaFin: data.fechaFin, // ISO string
  // Opcionales para ADMIN/GESTOR
  ...(data.ownerType ? { ownerType: data.ownerType } : {}),
  ...(data.inmobiliariaId != null ? { inmobiliariaId: data.inmobiliariaId } : {}),
});

// ===== FUNCIONES DE API =====
export const getAllPrioridades = async (params = {}) => {
  if (USE_MOCK) {
    console.log('🔍 [MOCK] Obteniendo prioridades...', params);
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      success: true,
      data: {
        prioridades: [],
        total: 0,
      },
      message: 'Prioridades obtenidas correctamente (MOCK)'
    };
  }

  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else if (typeof value === 'object') {
          // Para rangos de fechas
          if (value.min != null) queryParams.append(`${key}Desde`, value.min);
          if (value.max != null) queryParams.append(`${key}Hasta`, value.max);
        } else {
          queryParams.append(key, value);
        }
      }
    });
    
    const queryString = queryParams.toString();
    const url = `/prioridades${queryString ? `?${queryString}` : ''}`;
    
    const response = await http(url, { method: 'GET' });
    let data;
    if (response && typeof response === 'object' && response.json) {
      data = await response.json();
    } else {
      data = response;
    }

    let prioridadesData = [];
    let total = 0;

    if (data && typeof data === 'object') {
      if (data.data) {
        if (data.data.prioridades && Array.isArray(data.data.prioridades)) {
          prioridadesData = data.data.prioridades;
          total = data.data.total ?? data.data.prioridades.length;
        } else if (Array.isArray(data.data)) {
          prioridadesData = data.data;
          total = data.data.length;
        }
      } else if (data.prioridades && Array.isArray(data.prioridades)) {
        prioridadesData = data.prioridades;
        total = data.total ?? data.prioridades.length;
      } else if (Array.isArray(data)) {
        prioridadesData = data;
        total = data.length;
      }
    }

    return {
      success: true,
      data: {
        prioridades: prioridadesData.map(fromApi),
        total: total,
      },
      message: response.message || 'Prioridades obtenidas correctamente'
    };
  } catch (error) {
    console.error('❌ Error obteniendo prioridades:', error);
    return {
      success: false,
      data: { prioridades: [], total: 0 },
      message: error.message || 'Error al obtener prioridades'
    };
  }
};

export const getPrioridadById = async (id) => {
  if (USE_MOCK) {
    return {
      success: true,
      data: null,
      message: 'Prioridad no encontrada (MOCK)'
    };
  }

  try {
    const response = await httpJson(`/prioridades/${id}`, {
      method: 'GET'
    });

    const raw = response?.data ?? response;
    const normalized = fromApi(raw);

    return {
      success: true,
      data: normalized,
      message: response.message || 'Prioridad obtenida correctamente'
    };
  } catch (error) {
    console.error('❌ Error obteniendo prioridad:', error);
    throw new Error(error?.message || 'Error al obtener prioridad');
  }
};

export const createPrioridad = async (data) => {
  if (USE_MOCK) {
    const newPrioridad = {
      id: Math.floor(Math.random() * 1000),
      ...data,
      estado: 'ACTIVA',
      createdAt: new Date().toISOString()
    };
    return {
      success: true,
      data: fromApi(newPrioridad),
      message: 'Prioridad creada correctamente (MOCK)'
    };
  }

  try {
    const body = toApi(data);
    const response = await http('/prioridades', {
      method: 'POST',
      body: body
    });

    const resData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      // Extraer mensaje de error del backend
      let errorMsg = resData?.message || resData?.errors?.[0]?.message || "Error al crear prioridad";
      
      // Si hay errores de validación (array), extraer todos los mensajes
      if (resData?.errors && Array.isArray(resData.errors) && resData.errors.length > 0) {
        const mensajes = resData.errors.map((e) => {
          if (typeof e === 'string') return e;
          return e.message || 'Error de validación';
        });
        errorMsg = mensajes.join(", ");
      }
      
      const error = new Error(errorMsg);
      error.response = { data: resData, status: response.status };
      throw error;
    }

    const raw = resData?.data ?? resData;
    
    return {
      success: true,
      data: fromApi(raw),
      message: resData?.message || 'Prioridad creada correctamente'
    };
  } catch (error) {
    if (error && !error.response) {
      error.response = { data: {}, status: error.status || 500 };
    }
    throw error;
  }
};

export const updatePrioridad = async (id, data) => {
  if (USE_MOCK) {
    return {
      success: true,
      data: { ...data, id },
      message: 'Prioridad actualizada correctamente (MOCK)'
    };
  }

  try {
    const body = {
      ...(data.numero !== undefined ? { numero: data.numero } : {}),
      ...(data.inmobiliariaId !== undefined ? { inmobiliariaId: data.inmobiliariaId } : {}),
      ...(data.fechaFin !== undefined ? { fechaFin: data.fechaFin } : {}),
    };

    const response = await http(`/prioridades/${id}`, {
      method: 'PATCH',
      body: body
    });
    
    const resData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const errorMsg = resData?.message || "Error al actualizar prioridad";
      throw new Error(errorMsg);
    }

    const raw = resData?.data ?? resData;
    const normalized = fromApi(raw);

    return {
      success: true,
      data: normalized,
      message: resData.message || 'Prioridad actualizada correctamente'
    };
  } catch (error) {
    console.error('❌ Error actualizando prioridad:', error);
    throw error;
  }
};

export const cancelPrioridad = async (id) => {
  if (USE_MOCK) {
    return {
      success: true,
      data: null,
      message: 'Prioridad cancelada correctamente (MOCK)'
    };
  }

  try {
    const response = await http(`/prioridades/${id}/cancelar`, {
      method: 'PATCH'
    });
    
    const resData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const errorMsg = resData?.message || "Error al cancelar prioridad";
      throw new Error(errorMsg);
    }

    const raw = resData?.data ?? resData;
    const normalized = fromApi(raw);

    return {
      success: true,
      data: normalized,
      message: resData.message || 'Prioridad cancelada correctamente'
    };
  } catch (error) {
    console.error('❌ Error cancelando prioridad:', error);
    throw error;
  }
};

export const finalizePrioridad = async (id) => {
  if (USE_MOCK) {
    return {
      success: true,
      data: null,
      message: 'Prioridad finalizada correctamente (MOCK)'
    };
  }

  try {
    const response = await http(`/prioridades/${id}/finalizar`, {
      method: 'PATCH'
    });
    
    const resData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const errorMsg = resData?.message || "Error al finalizar prioridad";
      throw new Error(errorMsg);
    }

    const raw = resData?.data ?? resData;
    const normalized = fromApi(raw);

    return {
      success: true,
      data: normalized,
      message: resData.message || 'Prioridad finalizada correctamente'
    };
  } catch (error) {
    console.error('❌ Error finalizando prioridad:', error);
    throw error;
  }
};

export const expirePrioridadesManual = async () => {
  if (USE_MOCK) {
    return {
      success: true,
      data: { expired: 0 },
      message: 'No hay prioridades vencidas (MOCK)'
    };
  }

  try {
    const response = await http('/prioridades/jobs/expire', {
      method: 'POST'
    });
    
    const resData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      const errorMsg = resData?.message || "Error al expirar prioridades";
      throw new Error(errorMsg);
    }

    return {
      success: true,
      data: resData?.data ?? resData,
      message: resData.message || 'Prioridades expiradas correctamente'
    };
  } catch (error) {
    console.error('❌ Error expirando prioridades:', error);
    throw error;
  }
};

export { fromApi, toApi };
