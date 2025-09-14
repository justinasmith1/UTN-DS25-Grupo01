// Adapter único para Ventas. Si USE_MOCK=true uso memoria local; si no, pego al backend.
// Siempre devuelvo { data: ... } para no acoplar la UI a la forma del backend.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http } from "../http/http";

const BASE = "/ventas"; // si el back usa otra ruta, solo la cambio acá

const ok = (data) => ({ data });

/* ----------------------------- MODO MOCK ----------------------------- */
let VENTAS = [];
let seeded = false;

// genero un id simple "V001", "V002", etc
const nextId = () => `V${String(VENTAS.length + 1).padStart(3, "0")}`;

async function ensureSeeded() {
  if (seeded) return;
  try {
    // si en lib/data hubiera ventas de ejemplo, las traigo (opcional)
    const mod = await import("../data");
    const arr = mod?.mockSales || [];
    VENTAS = arr.map((v) => ({ ...v }));
  } catch {
    VENTAS = [];
  } finally {
    seeded = true;
  }
}

// Funcion de mock para getAll con filtros, orden y paginacion
async function mockGetAll(params = {}) {
  await ensureSeeded();

  // 1) Filtros (los aplico sobre una copia)
  let out = [...VENTAS];
  const { lotId, inmobiliariaId, q } = params || {};
  if (lotId) out = out.filter((v) => String(v.lotId) === String(lotId));
  if (inmobiliariaId != null) out = out.filter((v) => String(v.inmobiliariaId) === String(inmobiliariaId));
  if (q) {
    const s = String(q).toLowerCase();
    out = out.filter(
      (v) =>
        String(v.id).toLowerCase().includes(s) ||
        String(v.lotId).toLowerCase().includes(s) ||
        String(v.observaciones || "").toLowerCase().includes(s)
    );
  }

  // 2) Orden (sortBy + sortDir)
  const sortBy  = params.sortBy  || "date"; // id | date | amount | lotId
  const sortDir = (params.sortDir || "desc").toLowerCase(); // asc | desc
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

  // 3) Paginación (page + pageSize)
  const page     = Math.max(1, parseInt(params.page ?? 1, 10));
  const pageSize = Math.max(1, parseInt(params.pageSize ?? 10, 10));
  const total    = out.length;
  const start    = (page - 1) * pageSize;
  const end      = start + pageSize;
  const pageItems = out.slice(start, end);

  // Devuelvo datos + meta (el front usa meta si existe; si no, se las arregla)
  return { data: pageItems, meta: { total, page, pageSize } };
}

// -----------------------------------
// Funciones mock CRUD simples
// -----------------------------------
async function mockGetById(id) {
  await ensureSeeded();
  const found = VENTAS.find((v) => v.id === id);
  if (!found) throw new Error("Venta no encontrada");
  return ok(found);
}
async function mockCreate(payload) {
  await ensureSeeded();
  const nuevo = {
    id: nextId(),
    date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    status: "Registrada",
    ...payload, // lote id, monto, comprador?, inmobiliariaId, observaciones...
  };
  VENTAS.unshift(nuevo);
  return ok(nuevo);
}
async function mockUpdate(id, payload) {
  await ensureSeeded();
  const i = VENTAS.findIndex((v) => v.id === id);
  if (i === -1) throw new Error("Venta no encontrada");
  VENTAS[i] = { ...VENTAS[i], ...payload };
  return ok(VENTAS[i]);
}
async function mockDelete(id) {
  await ensureSeeded();
  const prev = VENTAS.length;
  VENTAS = VENTAS.filter((v) => v.id !== id);
  if (VENTAS.length === prev) throw new Error("Venta no encontrada");
  return ok(true);
}

/* ----------------------------- MODO REAL ----------------------------- */
async function apiGetAll(params = {}) {
  const url = new URL(BASE, import.meta.env.VITE_API_BASE_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") url.searchParams.set(k, v);
  });
  const res = await http(url.toString(), { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar ventas");
  return data?.data ? data : ok(data);
}
async function apiGetById(id) {
  const res = await http(`${BASE}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar la venta");
  return data?.data ? data : ok(data);
}
async function apiCreate(payload) {
  const res = await http(`${BASE}`, { method: "POST", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear la venta");
  return data?.data ? data : ok(data);
}
async function apiUpdate(id, payload) {
  const res = await http(`${BASE}/${id}`, { method: "PUT", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al actualizar la venta");
  return data?.data ? data : ok(data);
}
async function apiDelete(id) {
  const res = await http(`${BASE}/${id}`, { method: "DELETE" });
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
