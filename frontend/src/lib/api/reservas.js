// Adapter de Reservas. Mantengo una interfaz única para mock y real.
// Notas de diseño:
// - Siempre devuelvo { data: ... } para que el resto del front no dependa del shape del back.
// - En mock mantengo un array en memoria (stateful) para poder crear/editar/borrar sin backend.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";

import { http } from "../http/http";

// Base de la API real (ajustá si el back define otra ruta)
const BASE = "/reservas";

// Helper para normalizar respuestas
const ok = (data) => ({ data });

/* ------------------------------ MODO MOCK --------------------------------- */
// Estado en memoria (se inicializa vacío)
let RESERVAS = [];

function nextId() {
  const n = RESERVAS.length + 1;
  return `R${String(n).padStart(3, "0")}`;
}

// Cargo data inicial opcional desde mockUser (si existe) SOLO una vez
let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  try {
    const mod = await import("../data"); // no rompe prod: sólo se importa en mock
    const arr = mod?.mockUser?.reservations || [];
    RESERVAS = arr.map((r) => ({ ...r })); // clono para poder mutar
  } catch {
    RESERVAS = [];
  } finally {
    seeded = true;
  }
}

async function mockGetAll(params = {}) {
  await ensureSeeded();
  // Filtros comunes: por inmobiliariaId, por lotId, por status (opcionales)
  const { inmobiliariaId, lotId, status } = params;
  let out = [...RESERVAS];
  if (inmobiliariaId != null) out = out.filter((r) => r.inmobiliariaId === inmobiliariaId);
  if (lotId != null) out = out.filter((r) => r.lotId === lotId);
  if (status != null) out = out.filter((r) => r.status === status);
  return ok(out);
}

async function mockGetById(id) {
  await ensureSeeded();
  const found = RESERVAS.find((r) => r.id === id);
  if (!found) throw new Error("Reserva no encontrada");
  return ok(found);
}

async function mockCreate(payload) {
  await ensureSeeded();
  const nuevo = {
    id: nextId(),
    date: new Date().toISOString().slice(0, 10),
    status: "Activa",
    ...payload, // lotId, amount, inmobiliariaId, observaciones, etc.
  };
  RESERVAS.push(nuevo);
  return ok(nuevo);
}

async function mockUpdate(id, payload) {
  await ensureSeeded();
  const i = RESERVAS.findIndex((r) => r.id === id);
  if (i === -1) throw new Error("Reserva no encontrada");
  RESERVAS[i] = { ...RESERVAS[i], ...payload };
  return ok(RESERVAS[i]);
}

async function mockDelete(id) {
  await ensureSeeded();
  const prev = RESERVAS.length;
  RESERVAS = RESERVAS.filter((r) => r.id !== id);
  if (RESERVAS.length === prev) throw new Error("Reserva no encontrada");
  return ok(true);
}

/* ------------------------------ MODO REAL --------------------------------- */
// Nota: si el backend devuelve { data: ... } lo respeto, si no, lo envuelvo con ok()

async function apiGetAll(params = {}) {
  const url = new URL(BASE, import.meta.env.VITE_API_BASE_URL);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null && v !== "") url.searchParams.set(k, v);
  });
  const res = await http(url.toString(), { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar reservas");
  return data?.data ? data : ok(data);
}

async function apiGetById(id) {
  const res = await http(`${BASE}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar la reserva");
  return data?.data ? data : ok(data);
}

async function apiCreate(payload) {
  const res = await http(`${BASE}`, { method: "POST", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear la reserva");
  return data?.data ? data : ok(data);
}

async function apiUpdate(id, payload) {
  const res = await http(`${BASE}/${id}`, { method: "PUT", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al actualizar la reserva");
  return data?.data ? data : ok(data);
}

async function apiDelete(id) {
  const res = await http(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Error al eliminar la reserva");
  }
  return ok(true);
}

/* ------------------------------ EXPORT PÚBLICO ---------------------------- */

export function getAllReservas(params)   { return USE_MOCK ? mockGetAll(params)   : apiGetAll(params); }
export function getReservaById(id)       { return USE_MOCK ? mockGetById(id)      : apiGetById(id); }
export function createReserva(payload)   { return USE_MOCK ? mockCreate(payload)  : apiCreate(payload); }
export function updateReserva(id, data)  { return USE_MOCK ? mockUpdate(id, data) : apiUpdate(id, data); }
export function deleteReserva(id)        { return USE_MOCK ? mockDelete(id)       : apiDelete(id); }
