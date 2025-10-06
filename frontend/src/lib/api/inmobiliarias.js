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
      createdAt: "2023-01-15T10:00:00Z"
    },
    { 
      id: "I002", 
      nombre: "Delta Real Estate", 
      razonSocial: "Delta Real Estate S.R.L.",
      comxventa: 4.0,
      contacto: "11-5555-0002",
      cantidadVentas: 8,
      createdAt: "2023-03-20T14:30:00Z"
    },
    { 
      id: "I003", 
      nombre: "Inmobiliaria Central", 
      razonSocial: "Inmobiliaria Central S.A.",
      comxventa: 2.8,
      contacto: "11-5555-0003",
      cantidadVentas: 23,
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

  console.log('🔍 API Response raw data:', data);
  console.log('🔍 API Response data structure:', JSON.stringify(data, null, 2));
  console.log('🔍 data.data:', data.data);
  console.log('🔍 typeof data.data:', typeof data.data);
  console.log('🔍 Array.isArray(data.data):', Array.isArray(data.data));
  
  // Si data.data es un objeto, intentar extraer el array de inmobiliarias
  let inmobiliariasArray = [];
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    console.log('🔍 data.data keys:', Object.keys(data.data));
    // Buscar posibles claves que contengan el array
    if (data.data.inmobiliarias && Array.isArray(data.data.inmobiliarias)) {
      inmobiliariasArray = data.data.inmobiliarias;
      console.log('🔍 Found inmobiliarias array:', inmobiliariasArray);
    } else if (data.data.rows && Array.isArray(data.data.rows)) {
      inmobiliariasArray = data.data.rows;
      console.log('🔍 Found rows array:', inmobiliariasArray);
    } else {
      console.log('🔍 No array found in data.data, trying to convert object to array');
      // Si es un objeto con propiedades que parecen inmobiliarias, convertirlo a array
      const values = Object.values(data.data);
      if (values.length > 0 && typeof values[0] === 'object') {
        inmobiliariasArray = values;
        console.log('🔍 Converted object values to array:', inmobiliariasArray);
      }
    }
  }
  
  const arr = normalizeApiListResponse(data);
  console.log('🔍 Normalized array:', arr);
  console.log('🔍 Manual inmobiliarias array:', inmobiliariasArray);
  
  // Usar el array manual si el normalizado está vacío
  const finalArray = arr.length > 0 ? arr : inmobiliariasArray;
  console.log('🔍 Final array to use:', finalArray);
  
  const mapped = finalArray.map(fromApi);
  console.log('🔍 Mapped data:', mapped);
  
  const meta = data?.meta ?? { total: arr.length, page: Number(params.page || 1), pageSize: Number(params.pageSize || arr.length) };
  return { data: mapped, meta };
}

async function apiGetById(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al obtener inmobiliaria");
  return ok(fromApi(data?.data ?? data));
}

async function apiCreate(payload) {
  const res = await fetchWithFallback(PRIMARY, { method: "POST", body: toApi(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear inmobiliaria");
  return ok(fromApi(data?.data ?? data));
}

async function apiUpdate(id, payload) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "PUT", body: toApi(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al actualizar inmobiliaria");
  return ok(fromApi(data?.data ?? data));
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
