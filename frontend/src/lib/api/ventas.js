// Adapter único para Ventas. Si USE_MOCK=true uso memoria local; si no, pego al backend.
// Siempre devuelvo { data: ... } para no acoplar la UI al shape del backend.

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

async function mockGetAll(params = {}) {
  await ensureSeeded();
  let out = [...VENTAS];
  // filtros simples opcionales
  if (params?.lotId) out = out.filter((v) => String(v.lotId) === String(params.lotId));
  if (params?.inmobiliariaId != null)
    out = out.filter((v) => v.inmobiliariaId === params.inmobiliariaId);
  return ok(out);
}
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
    ...payload, // lotId, amount, comprador?, inmobiliariaId, observaciones...
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
