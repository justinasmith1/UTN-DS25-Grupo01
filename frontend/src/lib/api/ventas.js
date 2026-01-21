// src/lib/api/ventas.js
// Adapter para Ventas: traduce UI <-> Backend y maneja listado/CRUD.
// Cambios clave:
// - Endpoint: intenta "/Ventas" (mayúscula) y si 404 prueba "/ventas".
// - fromApi / toApi: mapean nombres.
// - list(): usa normalizador para entregar { data, meta } consistente.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http, normalizeApiListResponse } from "../http/http";

const PRIMARY = "/ventas";
const FALLBACK = "/Ventas";

const ok = (data) => ({ data });

const toNumberOrNull = (v) => (v === "" || v == null ? null : Number(v));

// Backend -> UI
const fromApi = (row = {}) => {
  const lotId =
    row.lotId ?? row.loteId ?? row.lote_id ?? row.lote ?? row.lot ?? null;
  const lotMapId =
    row.lote?.mapId ??
    row.lotMapId ??
    row.mapId ??
    (typeof row.codigo === "string" ? row.codigo : null);

  const ensureLote = () => {
    if (row.lote) {
      return {
        ...row.lote,
        mapId: row.lote.mapId ?? lotMapId ?? null,
      };
    }
    if (lotId != null && lotMapId != null) {
      return {
        id: lotId,
        mapId: lotMapId,
      };
    }
    return row.lote ?? null;
  };

  return {
    id: row.id ?? row.ventaId ?? row.Id,
    numero: row.numero ?? row.numeroVenta ?? row.numero_publico ?? null,
    lotId,
    lotMapId: lotMapId ?? null,
    lote: ensureLote(),
    // Preservar campos en español del backend (monto, fechaVenta, estado, tipoPago, plazoEscritura)
    monto: row.monto != null ? (typeof row.monto === "number" ? row.monto : Number(row.monto)) : (row.amount != null ? Number(row.amount) : null),
    fechaVenta: row.fechaVenta ?? row.date ?? row.fecha ?? null,
    estado: row.estado ?? row.status ?? null,
    tipoPago: row.tipoPago ?? row.paymentType ?? null,
    plazoEscritura: row.plazoEscritura ?? row.plazo_escritura ?? null,
    fechaBaja: row.fechaBaja ?? row.fecha_baja ?? null,
    // Mantener compatibilidad con nombres en inglés para código existente
    date: row.fechaVenta ?? row.date ?? row.fecha ?? null,
    status: row.estado ?? row.status ?? null,
    amount: row.monto != null ? (typeof row.monto === "number" ? row.monto : Number(row.monto)) : (row.amount != null ? Number(row.amount) : null),
    paymentType: row.tipoPago ?? row.paymentType ?? null,
    buyerId: row.buyerId ?? row.compradorId ?? null,
    compradorId: row.compradorId ?? row.buyerId ?? null,
    inmobiliariaId: row.inmobiliariaId ?? row.inmobiliaria_id ?? null,
    reservaId: row.reservaId ?? row.reserva_id ?? null,
    observaciones: row.observaciones ?? row.notas ?? "",
    // Estado operativo: usar campo estadoOperativo directamente si existe, sino default OPERATIVO
    estadoOperativo: row.estadoOperativo ?? (() => {
      // Fallback: derivar de estado solo si es OPERATIVO/ELIMINADO (compatibilidad con datos antiguos)
      const estadoStr = String(row.estado ?? "").toUpperCase().trim();
      if (estadoStr === "OPERATIVO" || estadoStr === "ELIMINADO") {
        return estadoStr;
      }
      return "OPERATIVO";
    })(),
    // Preservar fechas del backend
    createdAt: row.createdAt ?? row.fechaCreacion ?? null,
    updatedAt: row.updatedAt ?? row.updateAt ?? row.fechaActualizacion ?? null,
  };
};

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
  
  const raw = data?.data ?? data;
  const base = fromApi(raw);
  
  return ok({
    ...base,
    // Preservar relaciones completas del backend
    comprador: raw?.comprador || base?.comprador || null,
    lote: raw?.lote
      ? { ...raw.lote, mapId: raw.lote.mapId ?? base.lotMapId ?? null }
      : base.lote || null,
    inmobiliaria: raw?.inmobiliaria || base?.inmobiliaria || null,
    reserva: raw?.reserva || null,
  });
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
  const res = await fetchWithFallback(PRIMARY, { method: "POST", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let errorMsg = data?.message || "Error al crear la venta";
    
    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const mensajes = data.errors.map((err) => {
        if (typeof err === 'string') return err;
        const campo = err.path?.[0] || '';
        const msg = err.message || '';
        if (msg.includes('expected string, received null')) {
          return `${campo || 'Campo'}: no puede estar vacío`;
        }
        if (msg.includes('expected number')) {
          return `${campo || 'Campo'}: debe ser un número válido`;
        }
        return msg || 'Error de validación';
      });
      errorMsg = mensajes.join(", ");
    } else if (data?.error) {
      errorMsg = data.error;
    }
    
    const error = new Error(errorMsg);
    error.response = { data };
    throw error;
  }
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
  if (payload.numero != null) body.numero = payload.numero;
  if (payload.compradorId != null) body.compradorId = payload.compradorId;
  if (payload.inmobiliariaId != null) body.inmobiliariaId = payload.inmobiliariaId;
  if (payload.reservaId != null) body.reservaId = payload.reservaId;
  
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "PUT", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Error al actualizar la venta");
  }
  
  const raw = data?.data ?? data;
  const base = fromApi(raw);
  
  return ok({
    ...base,
    comprador: raw?.comprador || base?.comprador || null,
    lote: raw?.lote
      ? { ...raw.lote, mapId: raw.lote.mapId ?? base.lotMapId ?? null }
      : base.lote || null,
    inmobiliaria: raw?.inmobiliaria || base?.inmobiliaria || null,
    reserva: raw?.reserva || null,
  });
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
async function mockDesactivar(id) {
  ensureSeed();
  const i = VENTAS.findIndex((v) => String(v.id) === String(id));
  if (i < 0) throw new Error("Venta no encontrada");
  VENTAS[i] = { ...VENTAS[i], estado: "ELIMINADO", fechaBaja: new Date().toISOString() };
  return ok(VENTAS[i]);
}

async function mockReactivar(id) {
  ensureSeed();
  const i = VENTAS.findIndex((v) => String(v.id) === String(id));
  if (i < 0) throw new Error("Venta no encontrada");
  VENTAS[i] = { ...VENTAS[i], estado: "OPERATIVO", fechaBaja: null };
  return ok(VENTAS[i]);
}

async function apiDesactivar(id) {
  // Usamos PATCH /:id/eliminar para soft delete (estadoOperativo = ELIMINADO)
  const res = await fetchWithFallback(`${PRIMARY}/${id}/eliminar`, { method: "PATCH" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al eliminar venta");
  return ok(fromApi(data?.data ?? data));
}

async function apiReactivar(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}/reactivar`, { method: "PATCH" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al reactivar venta");
  return ok(fromApi(data?.data ?? data));
}

export function getAllVentas(params)  { return USE_MOCK ? mockGetAll(params)  : apiGetAll(params); }
export function getVentaById(id)      { return USE_MOCK ? mockGetById(id)     : apiGetById(id); }
export function createVenta(payload)  { return USE_MOCK ? mockCreate(payload) : apiCreate(payload); }
export function updateVenta(id,data)  { return USE_MOCK ? mockUpdate(id,data) : apiUpdate(id,data); }
export function deleteVenta(id)       { return USE_MOCK ? mockDelete(id)      : apiDelete(id); }
export function desactivarVenta(id)   { return USE_MOCK ? mockDesactivar(id)  : apiDesactivar(id); }
export function reactivarVenta(id)    { return USE_MOCK ? mockReactivar(id)   : apiReactivar(id); }

export function getVentasByInmobiliaria(id, params) {
  return USE_MOCK ? mockGetByInmobiliaria(id, params) : apiGetByInmobiliaria(id, params);
}
