// src/lib/api/reservas.js
// Adapter Reservas: UI <-> Backend con fallback de ruta y normalización de shape.
// Motivo: desacoplar la UI del naming del backend y evitar 404 por mayúsculas.
 
const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http } from "../http/http";

const PRIMARY = "/Reservas";  // back suele exponer /api/Reservas
const FALLBACK = "/reservas"; // por si la ruta está en minúsculas

const ok = (data) => ({ data });

// ---------- Helpers de mapeo ----------
const toNumberOrNull = (v) => (v === "" || v == null ? null : Number(v));

// Backend -> UI
const fromApi = (row = {}) => ({
  id: row.id ?? row.reservaId ?? row.Id,
  lotId: row.lotId ?? row.loteId ?? row.lote_id ?? row.lote ?? row.lot,
  date: row.date ?? row.fechaReserva ?? row.fecha ?? null,
  status: row.status ?? row.estado ?? null,
  amount: typeof row.amount === "number" ? row.amount : (row.sena != null ? Number(row.sena) : null),
  clienteId: row.clienteId ?? row.personaId ?? null,
  inmobiliariaId: row.inmobiliariaId ?? row.inmobiliaria_id ?? null,
  observaciones: row.observaciones ?? row.notas ?? "",
});

// UI -> Backend
// Acepto múltiples nombres usados en UI para no romper pantallas existentes:
// - lotId -> loteId
// - date|fechaReserva -> fechaReserva
// - amount|seniaMonto|sena -> sena
// - status -> estado
// - clienteId/personaId -> clienteId
const toApi = (form = {}) => ({
  loteId: form.lotId != null ? String(form.lotId).trim() : undefined,
  fechaReserva: form.fechaReserva || form.date || null,
  estado: form.status || "Activa",
  sena: toNumberOrNull(form.seniaMonto ?? form.amount ?? form.sena),
  clienteId: form.clienteId ?? form.personaId ?? null,
  inmobiliariaId: form.inmobiliariaId ?? null,
  observaciones: (form.observaciones ?? "").trim() || null,
});

// arma querystring
function qs(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}

// intenta ruta primaria y si 404 va al fallback
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
let RESERVAS = [];
let seeded = false;
const nextId = () => `R${String(RESERVAS.length + 1).padStart(3, "0")}`;

function ensureSeed() {
  if (seeded) return;
  RESERVAS = [
    { id: "R001", lotId: "L001", date: "2025-03-01", status: "Activa", amount: 50000, clienteId: 1, inmobiliariaId: 3, observaciones: "" },
    { id: "R002", lotId: "L002", date: "2025-03-10", status: "Cancelada", amount: 0, clienteId: 2, inmobiliariaId: null, observaciones: "" },
  ];
  seeded = true;
}

function mockFilterSortPage(list, params = {}) {
  let out = [...list];
  const q = (params.q || "").toLowerCase();
  if (q) out = out.filter((r) => String(r.id).toLowerCase().includes(q) || String(r.lotId).toLowerCase().includes(q));
  if (params.lotId) out = out.filter((r) => String(r.lotId) === String(params.lotId));
  if (params.inmobiliariaId) out = out.filter((r) => String(r.inmobiliariaId) === String(params.inmobiliariaId));
  if (params.clienteId) out = out.filter((r) => String(r.clienteId) === String(params.clienteId));

  const sortBy = params.sortBy || "date";
  const sortDir = (params.sortDir || "desc").toLowerCase();
  out.sort((a, b) => {
    const A = a[sortBy]; const B = b[sortBy];
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

async function mockGetAll(params = {}) { ensureSeed(); const { data, meta } = mockFilterSortPage(RESERVAS, params); return { data, meta }; }
async function mockGetById(id)        { ensureSeed(); return ok(RESERVAS.find((r) => String(r.id) === String(id))); }
async function mockCreate(payload)     { ensureSeed(); const row = fromApi({ ...toApi(payload), id: nextId() }); RESERVAS.unshift(row); return ok(row); }
async function mockUpdate(id, payload) { ensureSeed(); const i = RESERVAS.findIndex((r) => String(r.id) === String(id)); if (i < 0) throw new Error("Reserva no encontrada"); const row = { ...RESERVAS[i], ...fromApi(toApi(payload)) }; RESERVAS[i] = row; return ok(row); }
async function mockDelete(id)          { ensureSeed(); const i = RESERVAS.findIndex((r) => String(r.id) === String(id)); if (i < 0) throw new Error("Reserva no encontrada"); RESERVAS.splice(i, 1); return ok(true); }

/* ------------------------------- API --------------------------------- */
async function apiGetAll(params = {}) {
  const res = await fetchWithFallback(`${PRIMARY}${qs(params)}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar reservas");

  // Formatos aceptados: [{…}] | { data:[…] } | { data:[…], meta:{…} }
  const arr = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : [];
  const meta = data?.meta ?? {
    total: Number(data?.meta?.total ?? arr.length) || arr.length,
    page: Number(params.page || 1),
    pageSize: Number(params.pageSize || arr.length),
  };
  return { data: arr.map(fromApi), meta };
}

async function apiGetById(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al obtener la reserva");
  return ok(fromApi(data?.data ?? data));
}

async function apiCreate(payload) {
  const res = await fetchWithFallback(PRIMARY, { method: "POST", body: toApi(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear la reserva");
  return ok(fromApi(data?.data ?? data));
}

async function apiUpdate(id, payload) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "PUT", body: toApi(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al actualizar la reserva");
  return ok(fromApi(data?.data ?? data));
}

async function apiDelete(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Error al eliminar la reserva");
  }
  return ok(true);
}

/* --------------------------- EXPORT PÚBLICO --------------------------- */
export function getAllReservas(params)  { return USE_MOCK ? mockGetAll(params)  : apiGetAll(params); }
export function getReservaById(id)      { return USE_MOCK ? mockGetById(id)     : apiGetById(id); }
export function createReserva(payload)  { return USE_MOCK ? mockCreate(payload) : apiCreate(payload); }
export function updateReserva(id,data)  { return USE_MOCK ? mockUpdate(id,data) : apiUpdate(id,data); }
export function deleteReserva(id)       { return USE_MOCK ? mockDelete(id)      : apiDelete(id); }
