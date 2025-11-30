// src/lib/api/inmobiliarias.js
// Adapter Inmobiliarias: desacopla UI del contrato del backend.
// - Endpoint con fallback mayúsc/minúsculas.
// - fromApi/toApi mapean español<->inglés según use el back.
// - list() siempre entrega { data, meta } para paginar igual en la UI.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http, normalizeApiListResponse } from "../http/http";

const PRIMARY = "/Inmobiliarias";
const FALLBACK = "/inmobiliarias";

const ok = (data) => ({ data });

// ---------- Mapeos ----------
const fromApi = (row = {}) => ({
  id: row.id ?? row.idInmobiliaria ?? row.inmobiliariaId ?? row.Id,
  nombre: row.nombre ?? row.name ?? "",
  razonSocial: row.razonSocial ?? row.razon_social ?? "",
  comxventa: row.comxventa ?? row.comision ?? null,
  contacto: row.contacto ?? row.phone ?? row.telefono ?? "",
  cantidadVentas: row.cantidadVentas ?? row.ventas_count ?? 0,
  cantidadReservas: row.cantidadReservas ?? row.reservas_count ?? row._count?.reservas ?? 0,
  createdAt: row.createdAt ?? row.created_at ?? null,
  updateAt: row.updateAt ?? row.updated_at ?? null,
});

const toApi = (form = {}) => ({
  // Enviamos en español según el schema de Prisma
  nombre: (form.nombre ?? "").trim(),
  razonSocial: (form.razonSocial ?? "").trim(),
  comxventa: form.comxventa ? Number(form.comxventa) : null,
  contacto: (form.contacto ?? "").trim(),
});

// ---------- Utilitarios ----------
function qs(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}

async function fetchWithFallback(path, options) {
  let res = await http(path, options);
  if (res.status === 404) {
    const alt = path.startsWith(PRIMARY)
      ? path.replace(PRIMARY, FALLBACK)
      : path.replace(FALLBACK, PRIMARY);
    res = await http(alt, options);
  }
  return res;
}

/* ------------------------------ MOCK --------------------------------- */
let INMOS = [];
let seeded = false;
const nextId = () => `I${String(INMOS.length + 1).padStart(3, "0")}`;

function ensureSeed() {
  if (seeded) return;
  INMOS = [
    { 
      id: "I001", 
      nombre: "López Propiedades", 
      razonSocial: "López Propiedades S.A.",
      comxventa: 3.5,
      contacto: "11-5555-0001",
      cantidadVentas: 15,
      cantidadReservas: 5,
      createdAt: "2023-01-15T10:00:00Z"
    },
    { 
      id: "I002", 
      nombre: "Delta Real Estate", 
      razonSocial: "Delta Real Estate S.R.L.",
      comxventa: 4.0,
      contacto: "11-5555-0002",
      cantidadVentas: 8,
      cantidadReservas: 3,
      createdAt: "2023-03-20T14:30:00Z"
    },
    { 
      id: "I003", 
      nombre: "Inmobiliaria Central", 
      razonSocial: "Inmobiliaria Central S.A.",
      comxventa: 2.8,
      contacto: "11-5555-0003",
      cantidadVentas: 23,
      cantidadReservas: 12,
      createdAt: "2022-11-10T09:15:00Z"
    },
  ].map(fromApi);
  seeded = true;
}

function mockFilterSortPage(list, params = {}) {
  let out = [...list];
  const q = (params.q || "").toLowerCase();
  if (q) out = out.filter((a) =>
    (a.nombre || "").toLowerCase().includes(q) ||
    (a.razonSocial || "").toLowerCase().includes(q) ||
    (a.contacto || "").toLowerCase().includes(q) ||
    String(a.id || "").includes(q)
  );

  const sortBy = params.sortBy || "nombre";
  const sortDir = (params.sortDir || "asc").toLowerCase();
  out.sort((A, B) => {
    const a = A[sortBy] ?? "";
    const b = B[sortBy] ?? "";
    if (a < b) return sortDir === "asc" ? -1 : 1;
    if (a > b) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const page = Math.max(1, Number(params.page || 1));
  const pageSize = Math.max(1, Number(params.pageSize || 10));
  const total = out.length;
  const start = (page - 1) * pageSize;
  const data = out.slice(start, start + pageSize);
  return { data, meta: { total, page, pageSize } };
}

async function mockGetAll(params = {}) { ensureSeed(); const { data, meta } = mockFilterSortPage(INMOS, params); return { data, meta }; }
async function mockGetById(id)        { ensureSeed(); return ok(INMOS.find((x) => String(x.id) === String(id))); }
async function mockCreate(payload)     { ensureSeed(); const row = { id: nextId(), ...fromApi(toApi(payload)) }; INMOS.unshift(row); return ok(row); }
async function mockUpdate(id, payload) { ensureSeed(); const i = INMOS.findIndex((x) => String(x.id) === String(id)); if (i < 0) throw new Error("No encontrada"); INMOS[i] = { ...INMOS[i], ...fromApi(toApi(payload)) }; return ok(INMOS[i]); }
async function mockDelete(id)          { ensureSeed(); const i = INMOS.findIndex((x) => String(x.id) === String(id)); if (i < 0) throw new Error("No encontrada"); INMOS.splice(i, 1); return ok(true); }

/* ------------------------------- API --------------------------------- */
async function apiGetAll(params = {}) {
  const res = await fetchWithFallback(`${PRIMARY}${qs(params)}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar inmobiliarias");

  // Si data.data es un objeto, intentar extraer el array de inmobiliarias
  let inmobiliariasArray = [];
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    // Buscar posibles claves que contengan el array
    if (data.data.inmobiliarias && Array.isArray(data.data.inmobiliarias)) {
      inmobiliariasArray = data.data.inmobiliarias;
    } else if (data.data.rows && Array.isArray(data.data.rows)) {
      inmobiliariasArray = data.data.rows;
    } else {
      // Si es un objeto con propiedades que parecen inmobiliarias, convertirlo a array
      const values = Object.values(data.data);
      if (values.length > 0 && typeof values[0] === 'object') {
        inmobiliariasArray = values;
      }
    }
  }
  
  const arr = normalizeApiListResponse(data);
  
  // Usar el array manual si el normalizado está vacío
  const finalArray = arr.length > 0 ? arr : inmobiliariasArray;
  
  const mapped = finalArray.map((row) => {
    const base = fromApi(row);
    // Preservar cantidadVentas, cantidadReservas y fechas si vienen del backend
    return {
      ...base,
      cantidadVentas: row?.cantidadVentas ?? row?._count?.ventas ?? row?.ventas_count ?? base.cantidadVentas ?? 0,
      cantidadReservas: row?.cantidadReservas ?? row?._count?.reservas ?? row?.reservas_count ?? base.cantidadReservas ?? 0,
      createdAt: row?.createdAt ?? row?.created_at ?? base.createdAt ?? null,
      updatedAt: row?.updateAt ?? row?.updatedAt ?? row?.updated_at ?? base.updateAt ?? null,
    };
  });
  
  const meta = data?.meta ?? { total: arr.length, page: Number(params.page || 1), pageSize: Number(params.pageSize || arr.length) };
  return { data: mapped, meta };
}

async function apiGetById(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al obtener inmobiliaria");
  
  // El backend devuelve { success: true, data: { inmobiliaria: {...} } }
  const raw = data?.data?.inmobiliaria ?? data?.data ?? data;
  
  // Normalizar manteniendo las fechas, cantidadVentas y cantidadReservas correctamente mapeadas
  const normalized = {
    ...fromApi(raw),
    // Mapear fechas correctamente (backend usa updateAt sin 'd')
    createdAt: raw?.createdAt ?? raw?.created_at ?? null,
    updatedAt: raw?.updateAt ?? raw?.updatedAt ?? raw?.updated_at ?? null,
    // Incluir cantidadVentas y cantidadReservas si vienen del backend
    cantidadVentas: raw?.cantidadVentas ?? raw?._count?.ventas ?? raw?.ventas_count ?? 0,
    cantidadReservas: raw?.cantidadReservas ?? raw?._count?.reservas ?? raw?.reservas_count ?? 0,
  };
  
  return ok(normalized);
}

async function apiCreate(payload) {
  const res = await fetchWithFallback(PRIMARY, { method: "POST", body: toApi(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear inmobiliaria");
  return ok(fromApi(data?.data ?? data));
}

async function apiUpdate(id, payload) {
  // El payload ya viene con los campos correctos del componente (nombre, razonSocial, contacto, comxventa)
  // Construir el body validando que cumpla con el schema del backend
  const body = {};
  
  // Mapear campos que pueden venir (todos opcionales para PATCH)
  // El schema espera: nombre (string, min 1), razonSocial (string, min 1), contacto (string, max 100, opcional), comxventa (number, 0-100, opcional)
  if (payload.nombre !== undefined && payload.nombre !== null && String(payload.nombre).trim().length > 0) {
    const nombreTrim = String(payload.nombre).trim();
    if (nombreTrim.length > 100) {
      throw new Error("El nombre es demasiado largo (máximo 100 caracteres)");
    }
    body.nombre = nombreTrim;
  }
  
  if (payload.razonSocial !== undefined && payload.razonSocial !== null && String(payload.razonSocial).trim().length > 0) {
    const razonTrim = String(payload.razonSocial).trim();
    if (razonTrim.length > 150) {
      throw new Error("La razón social es demasiado larga (máximo 150 caracteres)");
    }
    body.razonSocial = razonTrim;
  }
  
  if (payload.contacto !== undefined && payload.contacto !== null && payload.contacto !== "") {
    const contactoTrim = String(payload.contacto).trim();
    if (contactoTrim.length > 100) {
      throw new Error("El contacto es demasiado largo (máximo 100 caracteres)");
    }
    if (contactoTrim.length > 0) {
      body.contacto = contactoTrim;
    }
  }
  
  if (payload.comxventa !== undefined && payload.comxventa !== null) {
    // Asegurar que sea un número válido
    const num = typeof payload.comxventa === 'number' ? payload.comxventa : Number(payload.comxventa);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error("La comisión por venta debe ser un número válido");
    }
    if (num < 0) {
      throw new Error("La comisión por venta no puede ser negativa");
    }
    if (num > 100) {
      throw new Error("La comisión por venta no puede ser mayor a 100");
    }
    body.comxventa = num;
  }
  
  // Validar que al menos haya un campo (como requiere el schema: .refine((d) => Object.keys(d).length > 0))
  if (Object.keys(body).length === 0) {
    throw new Error("Debe enviar al menos un campo para actualizar");
  }
  
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "PUT", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Si hay errores de validación, mostrar el mensaje más específico
    const errorMsg = data?.message || data?.errors?.[0]?.message || "Error al actualizar inmobiliaria";
    const error = new Error(errorMsg);
    error.status = res.status;
    error.errors = data?.errors;
    throw error;
  }
  
  // El backend devuelve { success: true, data: { inmobiliaria: {...}, message: '...' } }
  const raw = data?.data?.inmobiliaria ?? data?.data ?? data;
  
  // Normalizar manteniendo las fechas, cantidadVentas y cantidadReservas correctamente mapeadas
  const base = fromApi(raw);
  const normalized = {
    ...base,
    // Mapear fechas correctamente (backend usa updateAt sin 'd')
    createdAt: raw?.createdAt ?? raw?.created_at ?? base.createdAt ?? null,
    updatedAt: raw?.updateAt ?? raw?.updatedAt ?? raw?.updated_at ?? base.updateAt ?? null,
    // Incluir cantidadVentas y cantidadReservas si vienen del backend
    cantidadVentas: raw?.cantidadVentas ?? raw?._count?.ventas ?? raw?.ventas_count ?? base.cantidadVentas ?? 0,
    cantidadReservas: raw?.cantidadReservas ?? raw?._count?.reservas ?? raw?.reservas_count ?? base.cantidadReservas ?? 0,
  };
  
  return ok(normalized);
}

async function apiDelete(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Error al eliminar inmobiliaria");
  }
  return ok(true);
}

/* --------------------------- EXPORT PÚBLICO --------------------------- */
export function getAllInmobiliarias(params) { return USE_MOCK ? mockGetAll(params)   : apiGetAll(params); }
export function getInmobiliariaById(id)     { return USE_MOCK ? mockGetById(id)     : apiGetById(id); }
export function createInmobiliaria(payload) { return USE_MOCK ? mockCreate(payload) : apiCreate(payload); }
export function updateInmobiliaria(id, p)   { return USE_MOCK ? mockUpdate(id, p)   : apiUpdate(id, p); }
export function deleteInmobiliaria(id)      { return USE_MOCK ? mockDelete(id)      : apiDelete(id); }
