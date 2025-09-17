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
  id: row.id ?? row.inmobiliariaId ?? row.Id,
  name: row.name ?? row.nombre ?? "",
  email: row.email ?? row.correo ?? "",
  phone: row.phone ?? row.telefono ?? "",
  address: row.address ?? row.direccion ?? "",
});

const toApi = (form = {}) => ({
  // Enviamos en español si el back lo exige; si acepta inglés, también mapea.
  nombre: (form.name ?? "").trim(),
  email: (form.email ?? "").trim(),
  telefono: (form.phone ?? "").trim(),
  direccion: (form.address ?? "").trim(),
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
    { id: "I001", name: "López Propiedades", email: "info@lopez.com", phone: "11-5555-0001", address: "Av. Siempre Viva 123" },
    { id: "I002", name: "Delta Real Estate", email: "hola@delta.com", phone: "11-5555-0002", address: "Calle 9 #456" },
  ].map(fromApi);
  seeded = true;
}

function mockFilterSortPage(list, params = {}) {
  let out = [...list];
  const q = (params.q || "").toLowerCase();
  if (q) out = out.filter((a) =>
    (a.name || "").toLowerCase().includes(q) ||
    (a.email || "").toLowerCase().includes(q) ||
    (a.phone || "").toLowerCase().includes(q)
  );

  const sortBy = params.sortBy || "name";
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

  const arr = normalizeApiListResponse(data);
  const meta = data?.meta ?? { total: arr.length, page: Number(params.page || 1), pageSize: Number(params.pageSize || arr.length) };
  return { data: arr.map(fromApi), meta };
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
