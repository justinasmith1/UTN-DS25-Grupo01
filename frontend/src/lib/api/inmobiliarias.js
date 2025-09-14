// Adapter único para Inmobiliarias (mock ↔ real). Mantengo la UI desacoplada.
// Siempre devuelvo { data: ... } y, si puedo, sumo { meta } con total/paginado.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http } from "../http/http";

const BASE = "/inmobiliarias"; // si el back usa otro path, lo cambio acá
const ok = (data) => ({ data });

/* ----------------------------- MODO MOCK ----------------------------- */
let AGENCIAS = [];
let seeded = false;

// id simple "A001", "A002", ...
const nextId = () => `A${String(AGENCIAS.length + 1).padStart(3, "0")}`;

async function ensureSeeded() {
  if (seeded) return;
  try {
    // si hubiera datos de ejemplo en ../data, los traigo (opcional)
    const mod = await import("../data");
    const arr = mod?.mockAgencies || [];
    AGENCIAS = arr.map((a) => ({ ...a }));
  } catch {
    AGENCIAS = [];
  } finally {
    seeded = true;
  }
}

async function mockGetAll(params = {}) {
  await ensureSeeded();

  // 1) Filtros (q)
  let out = [...AGENCIAS];
  const { q } = params || {};
  if (q) {
    const s = String(q).toLowerCase();
    out = out.filter(
      (a) =>
        String(a.id).toLowerCase().includes(s) ||
        String(a.name || "").toLowerCase().includes(s) ||
        String(a.email || "").toLowerCase().includes(s) ||
        String(a.phone || "").toLowerCase().includes(s)
    );
  }

  // 2) Orden (sortBy + sortDir)
  const sortBy  = params.sortBy  || "name";       // name | email | phone | id
  const sortDir = (params.sortDir || "asc").toLowerCase(); // asc | desc
  out.sort((a, b) => {
    const A = a?.[sortBy] ?? "";
    const B = b?.[sortBy] ?? "";
    if (A < B) return sortDir === "asc" ? -1 : 1;
    if (A > B) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // 3) Paginación (page + pageSize)
  const page     = Math.max(1, parseInt(params.page ?? 1, 10));
  const pageSize = Math.max(1, parseInt(params.pageSize ?? 10, 10));
  const total    = out.length;
  const start    = (page - 1) * pageSize;
  const end      = start + pageSize;
  const pageItems = out.slice(start, end);

  return { data: pageItems, meta: { total, page, pageSize } };
}

async function mockGetById(id) {
  await ensureSeeded();
  const found = AGENCIAS.find((a) => String(a.id) === String(id));
  if (!found) throw new Error("Inmobiliaria no encontrada");
  return ok(found);
}
async function mockCreate(payload) {
  await ensureSeeded();
  const nuevo = { id: nextId(), name: "", email: "", phone: "", address: "", ...payload };
  AGENCIAS.unshift(nuevo);
  return ok(nuevo);
}
async function mockUpdate(id, payload) {
  await ensureSeeded();
  const i = AGENCIAS.findIndex((a) => String(a.id) === String(id));
  if (i === -1) throw new Error("Inmobiliaria no encontrada");
  AGENCIAS[i] = { ...AGENCIAS[i], ...payload };
  return ok(AGENCIAS[i]);
}
async function mockDelete(id) {
  await ensureSeeded();
  const prev = AGENCIAS.length;
  AGENCIAS = AGENCIAS.filter((a) => String(a.id) !== String(id));
  if (AGENCIAS.length === prev) throw new Error("Inmobiliaria no encontrada");
  return ok(true);
}

/* ----------------------------- MODO REAL ----------------------------- */
// Nota: si el back no devuelve { meta }, la página usa fallbacks locales.

async function apiGetAll(params = {}) {
  const url = new URL(BASE, import.meta.env.VITE_API_BASE_URL);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null && v !== "") url.searchParams.set(k, v);
  });
  const res = await http(url.toString(), { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar inmobiliarias");
  return data?.data ? data : ok(data);
}
async function apiGetById(id) {
  const res = await http(`${BASE}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar inmobiliaria");
  return data?.data ? data : ok(data);
}
async function apiCreate(payload) {
  const res = await http(`${BASE}`, { method: "POST", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear inmobiliaria");
  return data?.data ? data : ok(data);
}
async function apiUpdate(id, payload) {
  const res = await http(`${BASE}/${id}`, { method: "PUT", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al actualizar inmobiliaria");
  return data?.data ? data : ok(data);
}
async function apiDelete(id) {
  const res = await http(`${BASE}/${id}`, { method: "DELETE" });
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
export function updateInmobiliaria(id,p)    { return USE_MOCK ? mockUpdate(id,p)    : apiUpdate(id,p); }
export function deleteInmobiliaria(id)      { return USE_MOCK ? mockDelete(id)      : apiDelete(id); }
