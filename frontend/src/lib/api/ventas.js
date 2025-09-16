// src/lib/api/ventas.js
// Adapter para Ventas: traduce UI <-> Backend y maneja listado/CRUD.
// Cambios clave:
// - Endpoint: intenta "/Ventas" (mayúscula) y si 404 prueba "/ventas".
// - fromApi / toApi: mapean nombres (fechaVenta<->date, monto<->amount, estado<->status, tipoPago<->paymentType, compradorId<->buyerId).
// - list(): siempre retorna { data, meta } para que la UI pagine igual, aunque el back no envíe meta.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http } from "../http/http";

// Endpoint primario y fallback (por diferencia de mayúsculas en el back)
const PRIMARY = "/Ventas";
const FALLBACK = "/ventas";

const ok = (data) => ({ data });

// ---------- Helpers de mapeo ----------
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

// Arma querystring a partir de params (solo agrega definidos)
function qs(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}

// Intenta primario y si 404 prueba fallback (p.ej. mayúsculas/minúsculas)
async function fetchWithFallback(path, options) {
  let res = await http(path, options);
  if (res.status === 404) {
    const alt = path.startsWith(PRIMARY) ? path.replace(PRIMARY, FALLBACK) : path.replace(FALLBACK, PRIMARY);
    res = await http(alt, options);
  }
  return res;
}

/* ----------------------------- MODO MOCK ----------------------------- */
// (Dejo tu mock operativo por si usás USE_MOCK=true en algúna demo/local)
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

/* ------------------------------ MODO API ------------------------------ */

async function apiGetAll(params = {}) {
  const res = await fetchWithFallback(`${PRIMARY}${qs(params)}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar ventas");

  // Acepto varios formatos de back: [{…}] | { data:[…] } | { data:[…], meta:{…} }
  const arr = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []));
  const meta = data?.meta ?? { total: Number(data?.meta?.total ?? arr.length) || arr.length, page: Number(params.page || 1), pageSize: Number(params.pageSize || arr.length) };
  return { data: arr.map(fromApi), meta };
}

async function apiGetById(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al obtener la venta");
  return ok(fromApi(data?.data ?? data));
}

async function apiCreate(payload) {
  const res = await fetchWithFallback(PRIMARY, { method: "POST", body: toApi(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear la venta");
  return ok(fromApi(data?.data ?? data));
}

async function apiUpdate(id, payload) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "PUT", body: toApi(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al actualizar la venta");
  return ok(fromApi(data?.data ?? data));
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
