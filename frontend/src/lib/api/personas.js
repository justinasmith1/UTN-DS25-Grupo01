// Adapter de Personas (Propietarios / Inquilinos). UI desacoplada.
// Devuelvo { data } y, si puedo, sumo { meta } para paginado.

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
    const mod = await import("../data"); // opcional
    const arr = mod?.mockPeople || [];
    PERSONAS = arr.map((p) => ({ ...p }));
  } catch {
    PERSONAS = [];
  } finally {
    seeded = true;
  }
}

async function mockGetAll(params = {}) {
  await ensureSeeded();

  // 1) Filtros: tipo + búsqueda q
  const { tipo, q } = params || {};
  let out = [...PERSONAS];
  if (tipo) out = out.filter((p) => String(p.tipo).toUpperCase() === String(tipo).toUpperCase());
  if (q) {
    const s = String(q).toLowerCase();
    out = out.filter(
      (p) =>
        String(p.id).toLowerCase().includes(s) ||
        String(p.nombre || "").toLowerCase().includes(s) ||
        String(p.email || "").toLowerCase().includes(s) ||
        String(p.dni || "").toLowerCase().includes(s)
    );
  }

  // 2) Orden (sortBy + sortDir)
  const sortBy  = params.sortBy  || "nombre";     // nombre | email | dni | id | tipo
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
  const found = PERSONAS.find((p) => String(p.id) === String(id));
  if (!found) throw new Error("Persona no encontrada");
  return ok(found);
}
async function mockCreate(payload) {
  await ensureSeeded();
  const nuevo = {
    id: nextId(),
    tipo: "PROPIETARIO",
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
  Object.entries(params || {}).forEach(([k, v]) => {
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
