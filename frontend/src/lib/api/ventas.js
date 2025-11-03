// src/lib/api/ventas.js
// Adapter para Ventas: traduce UI <-> Backend y maneja listado/CRUD.
// Cambios clave:
// - Endpoint: intenta "/Ventas" (mayúscula) y si 404 prueba "/ventas".
// - fromApi / toApi: mapean nombres.
// - list(): usa normalizador para entregar { data, meta } consistente.

// Usar mock SOLO en desarrollo y controlado por su propio flag
const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
console.log("Ventas API - USO DE MOCK:", USE_MOCK);
import { http, normalizeApiListResponse } from "../http/http";

const PRIMARY = "/Ventas";
const FALLBACK = "/ventas";

const ok = (data) => ({ data });

const toNumberOrNull = (v) => (v === "" || v == null ? null : Number(v));

// Backend -> UI
const fromApi = (row = {}) => ({
  id: row.id ?? row.ventaId ?? row.Id,
  lotId: row.lotId ?? row.loteId ?? row.lote_id ?? row.lote ?? row.lot,
  date: row.date ?? row.fechaVenta ?? row.fecha ?? null,
  status: row.status ?? row.estado ?? null,
  amount: typeof row.amount === "number" ? row.amount : (row.monto != null ? Number(row.monto) : null),
  paymentType: row.paymentType ?? row.tipoPago ?? null,
  buyerId: row.buyerId ?? row.compradorId ?? null,
  inmobiliariaId: row.inmobiliariaId ?? row.inmobiliaria_id ?? null,
  reservaId: row.reservaId ?? row.reserva_id ?? null,
  observaciones: row.observaciones ?? row.notas ?? "",
});

// UI -> Backend
const toApi = (form = {}) => ({
  loteId: form.lotId != null ? String(form.lotId).trim() : undefined,
  fechaVenta: form.date || form.fechaVenta || null,
  estado: form.status || "Registrada",
  monto: toNumberOrNull(form.amount),
  tipoPago: form.paymentType || form.tipoPago || null,
  compradorId: form.buyerId ?? form.compradorId ?? null,
  inmobiliariaId: form.inmobiliariaId ?? null,
  reservaId: form.reservaId ?? null,
  observaciones: (form.observaciones ?? "").trim() || null,
});

// QS
function qs(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}

// Fallback de ruta
async function fetchWithFallback(path, options) {
  let res = await http(path, options);
  if (res.status === 404) {
    const alt = path.startsWith(PRIMARY) ? path.replace(PRIMARY, FALLBACK) : path.replace(FALLBACK, PRIMARY);
    res = await http(alt, options);
  }
  return res;
}

/* ----------------------------- MODO MOCK ----------------------------- */
let VENTAS = [];
let seeded = false;
const nextId = () => `V${String(VENTAS.length + 1).padStart(3, "0")}`;

function ensureSeed() {
  if (seeded) return;
  VENTAS = [
    { id: "V001", lotId: "L001", date: "2025-01-15", status: "Registrada", amount: 120000, paymentType: "Efectivo", buyerId: 1, inmobiliariaId: 3, observaciones: "" },
    { id: "V002", lotId: "L002", date: "2025-02-10", status: "Anulada", amount: 95000, paymentType: "Transferencia", buyerId: 2, inmobiliariaId: null, observaciones: "" },
  ];
  seeded = true;
}

function mockFilterSortPage(list, params = {}) {
  let out = [...list];
  const q = (params.q || "").toLowerCase();
  if (q) out = out.filter((v) => String(v.id).toLowerCase().includes(q) || String(v.lotId).toLowerCase().includes(q) || String(v.amount).includes(q));
  if (params.lotId) out = out.filter((v) => String(v.lotId) === String(params.lotId));
  if (params.inmobiliariaId) out = out.filter((v) => String(v.inmobiliariaId) === String(params.inmobiliariaId));

  const sortBy = params.sortBy || "date";
  const sortDir = (params.sortDir || "desc").toLowerCase();
  out.sort((a, b) => {
    const A = a[sortBy];
    const B = b[sortBy];
    if (A == null && B == null) return 0;
    if (A == null) return sortDir === "asc" ? -1 : 1;
    if (B == null) return sortDir === "asc" ? 1 : -1;
    if (A < B) return sortDir === "asc" ? -1 : 1;
    if (A > B) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const page = Math.max(1, Number(params.page || 1));
  const pageSize = Math.max(1, Number(params.pageSize || 10));
  const total = out.length;
  const start = (page - 1) * pageSize;
  const data = out.slice(start, start + pageSize);
  return { data, meta: { total, page, pageSize } };
}

async function mockGetAll(params = {}) { ensureSeed(); const { data, meta } = mockFilterSortPage(VENTAS, params); return { data, meta }; }
async function mockGetById(id)        { ensureSeed(); return ok(VENTAS.find((v) => String(v.id) === String(id))); }
async function mockCreate(payload)     { ensureSeed(); const row = fromApi({ ...toApi(payload), id: nextId() }); VENTAS.unshift(row); return ok(row); }
async function mockUpdate(id, payload) { ensureSeed(); const idx = VENTAS.findIndex((v) => String(v.id) === String(id)); if (idx < 0) throw new Error("Venta no encontrada"); const row = { ...VENTAS[idx], ...fromApi(toApi(payload)) }; VENTAS[idx] = row; return ok(row); }
async function mockDelete(id)          { ensureSeed(); const i = VENTAS.findIndex((v) => String(v.id) === String(id)); if (i < 0) throw new Error("Venta no encontrada"); VENTAS.splice(i, 1); return ok(true); }
async function mockGetByInmobiliaria(inmobiliariaId, params = {}) {
  return mockGetAll({ ...params, inmobiliariaId });
}

/* ------------------------------ MODO API ------------------------------ */
async function apiGetAll(params = {}) {
  const res = await fetchWithFallback(`${PRIMARY}${qs(params)}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar ventas");

  const arr = normalizeApiListResponse(data);
  const meta = data?.meta ?? { total: Number(data?.meta?.total ?? arr.length) || arr.length, page: Number(params.page || 1), pageSize: Number(params.pageSize || arr.length) };
  return { data: arr.map(fromApi), meta };
}

async function apiGetById(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al obtener la venta");
  
  // El backend devuelve { success: true, data: {...} }
  const raw = data?.data ?? data;
  
  // Preservar las relaciones completas que vienen del backend
  // El backend incluye: comprador, lote (con propietario), inmobiliaria
  const normalized = {
    ...fromApi(raw), // Campos planos normalizados
    // Preservar relaciones completas del backend
    comprador: raw?.comprador || null,
    lote: raw?.lote || null,
    inmobiliaria: raw?.inmobiliaria || null,
    // Mapear fechas correctamente (backend usa updateAt sin 'd')
    createdAt: raw?.createdAt ?? raw?.fechaCreacion ?? null,
    updatedAt: raw?.updateAt ?? raw?.updatedAt ?? raw?.fechaActualizacion ?? null,
  };
  
  return ok(normalized);
}

async function apiGetByInmobiliaria(inmobiliariaId, params = {}) {
  const res = await fetchWithFallback(
    `${PRIMARY}/inmobiliaria/${inmobiliariaId}${qs(params)}`,
    { method: "GET" }
  );
  const data = await res.json().catch(() => ({}));

  if (res.status === 404) {
    return {
      data: [],
      meta: {
        total: 0,
        page: Number(params.page || 1),
        pageSize: Number(params.pageSize || 0),
      },
      message: data?.message,
    };
  }

  if (!res.ok) {
    throw new Error(
      data?.message || "Error al cargar ventas de la inmobiliaria"
    );
  }

  const arr = normalizeApiListResponse(data);
  const mapped = arr.map(fromApi);

  return {
    data: mapped,
    meta: {
      total: Number(data?.total ?? mapped.length) || mapped.length,
      page: Number(params.page || 1),
      pageSize: Number(params.pageSize || mapped.length),
    },
  };
}

async function apiCreate(payload) {
  const res = await fetchWithFallback(PRIMARY, { method: "POST", body: toApi(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear la venta");
  return ok(fromApi(data?.data ?? data));
}

async function apiUpdate(id, payload) {
  // El payload ya viene con los campos correctos del componente (monto, estado, fechaVenta, etc.)
  // No usar toApi porque espera otro formato (form.date, form.amount, etc.)
  // Enviar directamente los campos que espera el backend según la validación
  const body = {};
  
  // Mapear campos que pueden venir
  if (payload.loteId != null) body.loteId = payload.loteId;
  if (payload.fechaVenta != null) body.fechaVenta = payload.fechaVenta;
  if (payload.monto != null) body.monto = payload.monto;
  if (payload.estado != null) body.estado = payload.estado;
  if (payload.plazoEscritura != null) body.plazoEscritura = payload.plazoEscritura;
  if (payload.tipoPago != null) body.tipoPago = payload.tipoPago;
  if (payload.compradorId != null) body.compradorId = payload.compradorId;
  if (payload.inmobiliariaId != null) body.inmobiliariaId = payload.inmobiliariaId;
  if (payload.reservaId != null) body.reservaId = payload.reservaId;
  
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "PUT", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Error al actualizar la venta");
  }
  
  // El backend devuelve { success: true, data: {...} } con la venta actualizada completa
  const raw = data?.data ?? data;
  
  // Preservar las relaciones completas que vienen del backend (igual que en apiGetById)
  const normalized = {
    ...fromApi(raw), // Campos planos normalizados
    // Preservar relaciones completas del backend
    comprador: raw?.comprador || null,
    lote: raw?.lote || null,
    inmobiliaria: raw?.inmobiliaria || null,
    // Mapear fechas correctamente (backend usa updateAt sin 'd')
    createdAt: raw?.createdAt ?? raw?.fechaCreacion ?? null,
    updatedAt: raw?.updateAt ?? raw?.updatedAt ?? raw?.fechaActualizacion ?? null,
  };
  
  return ok(normalized);
}

async function apiDelete(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Error al eliminar la venta");
  }
  return ok(true);
}

/* --------------------------- EXPORT PÚBLICO --------------------------- */
export function getAllVentas(params)  { return USE_MOCK ? mockGetAll(params)  : apiGetAll(params); }
export function getVentaById(id)      { return USE_MOCK ? mockGetById(id)     : apiGetById(id); }
export function createVenta(payload)  { return USE_MOCK ? mockCreate(payload) : apiCreate(payload); }
export function updateVenta(id,data)  { return USE_MOCK ? mockUpdate(id,data) : apiUpdate(id,data); }
export function deleteVenta(id)       { return USE_MOCK ? mockDelete(id)      : apiDelete(id); }
export function getVentasByInmobiliaria(id, params) {
  return USE_MOCK ? mockGetByInmobiliaria(id, params) : apiGetByInmobiliaria(id, params);
}
