// Adapter de Personas (Propietarios / Inquilinos). Mantengo la UI desacoplada del backend.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http } from "../http/http";

const BASE = "/personas"; // si el back usa otro path, lo cambio acá
const ok = (data) => ({ data });

/* --------------------------- MODO MOCK (memoria) --------------------------- */
let PERSONAS = [];
let seeded = false;

// id simple P001, P002, ...
const nextId = () => `P${String(PERSONAS.length + 1).padStart(3, "0")}`;

async function ensureSeeded() {
  if (seeded) return;
  try {
    const mod = await import("../data"); // opcional, solo si existe
    const arr = mod?.mockPeople || [];
    PERSONAS = arr.map((p) => ({ ...p }));
  } catch {
    PERSONAS = [];
  } finally {
    seeded = true;
  }
}

async function mockGetAll({ tipo, q } = {}) {
  await ensureSeeded();
  let out = [...PERSONAS];
  if (tipo) out = out.filter((p) => String(p.tipo).toUpperCase() === String(tipo).toUpperCase());
  if (q) {
    const s = q.toLowerCase();
    out = out.filter(
      (p) =>
        (p.nombre || "").toLowerCase().includes(s) ||
        (p.email || "").toLowerCase().includes(s) ||
        String(p.dni || "").toLowerCase().includes(s)
    );
  }
  return ok(out);
}
async function mockGetById(id) {
  await ensureSeeded();
  const found = PERSONAS.find((p) => String(p.id) === String(id));
  if (!found) throw new Error("Persona no encontrada");
  return ok(found);
}
async function mockCreate(payload) {
  await ensureSeeded();
  const nuevo = {
    id: nextId(),
    tipo: "PROPIETARIO", // PROPIETARIO | INQUILINO
    nombre: "",
    dni: "",
    email: "",
    phone: "",
    address: "",
    notas: "",
    ...payload,
  };
  PERSONAS.unshift(nuevo);
  return ok(nuevo);
}
async function mockUpdate(id, payload) {
  await ensureSeeded();
  const i = PERSONAS.findIndex((p) => String(p.id) === String(id));
  if (i === -1) throw new Error("Persona no encontrada");
  PERSONAS[i] = { ...PERSONAS[i], ...payload };
  return ok(PERSONAS[i]);
}
async function mockDelete(id) {
  await ensureSeeded();
  const prev = PERSONAS.length;
  PERSONAS = PERSONAS.filter((p) => String(p.id) !== String(id));
  if (PERSONAS.length === prev) throw new Error("Persona no encontrada");
  return ok(true);
}

/* ----------------------------- MODO REAL (API) ----------------------------- */
async function apiGetAll(params = {}) {
  const url = new URL(BASE, import.meta.env.VITE_API_BASE_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") url.searchParams.set(k, v);
  });
  const res = await http(url.toString(), { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar personas");
  return data?.data ? data : ok(data);
}
async function apiGetById(id) {
  const res = await http(`${BASE}/${id}`, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al cargar persona");
  return data?.data ? data : ok(data);
}
async function apiCreate(payload) {
  const res = await http(`${BASE}`, { method: "POST", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al crear persona");
  return data?.data ? data : ok(data);
}
async function apiUpdate(id, payload) {
  const res = await http(`${BASE}/${id}`, { method: "PUT", body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error al actualizar persona");
  return data?.data ? data : ok(data);
}
async function apiDelete(id) {
  const res = await http(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || "Error al eliminar persona");
  }
  return ok(true);
}

/* ------------------------------- EXPORTS ----------------------------------- */
export function getAllPersonas(params)  { return USE_MOCK ? mockGetAll(params)  : apiGetAll(params); }
export function getPersonaById(id)      { return USE_MOCK ? mockGetById(id)     : apiGetById(id); }
export function createPersona(payload)  { return USE_MOCK ? mockCreate(payload) : apiCreate(payload); }
export function updatePersona(id,data)  { return USE_MOCK ? mockUpdate(id,data) : apiUpdate(id,data); }
export function deletePersona(id)       { return USE_MOCK ? mockDelete(id)      : apiDelete(id); }
