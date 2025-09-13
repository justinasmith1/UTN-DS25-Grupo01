// src/lib/api/lotes.js
// Dejo un adapter unico para Lotes. Si USE_MOCK=true, uso data local;
// si no, pego al backend con el http() que ya inyecta Authorization.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";

import { http } from "../http/http";

// Paths (si el back usa otros, los cambio acá y no toco la UI), lo toco mas adelante
const BASE = "/lotes";

function ok(data) {
  // Normalizo la forma de respuesta para el front: { data: ... }
  return { data };
}

/* -------------------------- MODO MOCK (DESARROLLO) , esto se va dsp ------------------------- */
let LOTS = [];
async function ensureMockLoaded() {
  if (LOTS.length === 0) {
    const mod = await import("../data"); // <- usa mock actual que dsp voy a borrar
    LOTS = (mod.mockLots || []).map((x) => ({ ...x }));
  }
}

async function mockGetAll() {
  await ensureMockLoaded();
  return ok(LOTS);
}

async function mockGetById(id) {
  await ensureMockLoaded();
  const found = LOTS.find((l) => l.id === id);
  if (!found) throw new Error("Lote no encontrado");
  return ok(found);
}

async function mockCreate(payload) {
  await ensureMockLoaded();
  // Genero un id simple si no viene (no me importa la forma exacta en mock)
  const id = payload?.id || `L${String(LOTS.length + 1).padStart(3, "0")}`;
  const nuevo = { id, ...payload };
  LOTS.push(nuevo);
  return ok(nuevo);
}

async function mockUpdate(id, payload) {
  await ensureMockLoaded();
  const idx = LOTS.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("Lote no encontrado");
  LOTS[idx] = { ...LOTS[idx], ...payload };
  return ok(LOTS[idx]);
}

async function mockDelete(id) {
  await ensureMockLoaded();
  const prev = LOTS.length;
  LOTS = LOTS.filter((l) => l.id !== id);
  if (LOTS.length === prev) throw new Error("Lote no encontrado");
  return ok(true);
}

/* --------------------------- MODO REAL (BACKEND) --------------------------- */
async function apiGetAll() {
  const res = await http(`${BASE}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar lotes");
  // Normalizo a { data: [...] } si el back no trae ese envoltorio
  return data?.data ? data : ok(data);
}

async function apiGetById(id) {
  const res = await http(`${BASE}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar lote");
  return data?.data ? data : ok(data);
}

async function apiCreate(payload) {
  const res = await http(`${BASE}`, { method: "POST", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear lote");
  return data?.data ? data : ok(data);
}

async function apiUpdate(id, payload) {
  const res = await http(`${BASE}/${id}`, { method: "PUT", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al actualizar lote");
  return data?.data ? data : ok(data);
}

async function apiDelete(id) {
  const res = await http(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Error al eliminar lote");
  }
  return ok(true);
}

/* ------------------------------ EXPORT PÚBLICO ----------------------------- */
// Exporto la misma interfaz en ambos modos.
// Cuando este terminado el back, si hay akgo que cambiar que seguro va a pasar
// lo hago acá y no toco Dashboard/Map/Layout.

export async function getAllLotes() {
  return USE_MOCK ? mockGetAll() : apiGetAll();
}
export async function getLoteById(id) {
  return USE_MOCK ? mockGetById(id) : apiGetById(id);
}
export async function createLote(payload) {
  return USE_MOCK ? mockCreate(payload) : apiCreate(payload);
}
export async function updateLote(id, payload) {
  return USE_MOCK ? mockUpdate(id, payload) : apiUpdate(id, payload);
}
export async function deleteLote(id) {
  return USE_MOCK ? mockDelete(id) : apiDelete(id);
}
