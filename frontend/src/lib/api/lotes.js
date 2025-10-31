// src/lib/api/lotes.js
// Cliente de API para LOTES. Devuelve SIEMPRE { data: Array<LoteUI> }.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK;
console.log(USE_MOCK)
import { http } from "../http/http"; // usa Authorization y maneja 401/refresh

const PRIMARY = "/lotes";
const FALLBACK = "/lotes";

const ok = (data) => ({ data });

const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
const strOrNull = (v) => (v == null ? null : String(v));

// --------------------------- MAPEO BACK -> UI ---------------------------
function fromApi(x = {}) {
  const id = strOrNull(x.id ?? x.loteId ?? x.Id) ?? `${x.manzana ?? "?"}-${x.numero ?? "?"}`;
  const status = x.status ?? x.estado ?? null;
  const subStatus = x.subStatus ?? x.subestado ?? x.subEstado ?? x.estadoPlano ?? null;
  const owner =
    x.owner ??
    x.propietario?.nombre ??
    x.propietarioId ??
    null;
  const location =
    x.location ??
    (x.manzana != null || x.numero != null
      ? `Mz ${x.manzana ?? "?"} - Lt ${x.numero ?? "?"}`
      : null);

  return {
    id,
    status,            // ⇐ ojo: mantenemos status/ subStatus además de los campos originales
    subStatus,
    estado: x.estado ?? null,
    subestado: x.subestado ?? null,
    owner,
    location,
    superficie: numOrNull(x.superficie ?? x.superficieM2 ?? x.surface),
    price: numOrNull(x.price ?? x.precio),
    precio: numOrNull(x.precio ?? x.price),
    frente: numOrNull(x.frente),
    fondo: numOrNull(x.fondo),
    deuda: x.deuda ?? null,
    descripcion: x.descripcion ?? null,
    ...x, // preservo otros campos por compatibilidad
  };
}

// ------------------------------ QUERYSTRING ------------------------------
function qs(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") s.set(k, String(v));
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}

// --------------- Fallback de ruta (PRIMARY -> FALLBACK y viceversa) ---------------
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

/* ================================= MOCK ================================= */
let LOTES = [];
let seeded = false;
const nextId = () => `L${String(LOTES.length + 1).padStart(3, "0")}`;

function ensureSeed() {
  if (seeded) return;
  LOTES = [
    { id: "L001", manzana: "A", numero: 1, estado: "DISPONIBLE", superficieM2: 300, propietarioId: null, observaciones: "" },
    { id: "L002", manzana: "A", numero: 2, estado: "RESERVADO",  superficieM2: 280, propietarioId: null, observaciones: "" },
  ];
  seeded = true;
}
async function mockGetAll(params = {}) {
  ensureSeed();
  let out = [...LOTES];
  const q = (params.q || "").toLowerCase();
  if (q) out = out.filter(l =>
    String(l.id).toLowerCase().includes(q) ||
    String(l.manzana).toLowerCase().includes(q) ||
    String(l.numero).toLowerCase().includes(q)
  );
  const page = Math.max(1, Number(params.page || 1));
  const pageSize = Math.max(1, Number(params.pageSize || 12));
  const total = out.length;
  const start = (page - 1) * pageSize;
  const data = out.slice(start, start + pageSize).map(fromApi);
  return ok(data);
}
async function mockGetById(id)      { ensureSeed(); const f = LOTES.find(l => String(l.id) === String(id)); if (!f) throw new Error("Lote no encontrado"); return ok(fromApi(f)); }
async function mockCreate(payload)   { ensureSeed(); const row = payload; row.id = nextId(); LOTES.unshift(row); return ok(fromApi(row)); }
async function mockUpdate(id, p)     { ensureSeed(); const i = LOTES.findIndex(l => String(l.id) === String(id)); if (i < 0) throw new Error("Lote no encontrado"); LOTES[i] = { ...LOTES[i], ...p }; return ok(fromApi(LOTES[i])); }
async function mockDelete(id)        { ensureSeed(); const n = LOTES.length; LOTES = LOTES.filter(l => String(l.id) !== String(id)); if (LOTES.length === n) throw new Error("Lote no encontrado"); return ok(true); }

/* ================================ API REAL ================================ */
function pickArrayFromApi(json) {
  // Soporta:
  // - []                           (ya array)
  // - { data: [] }                 (array en data)
  // - { rows: [] }                 (array en rows)
  // - { data: { lotes: [] } }      (tu backend actual)
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json?.data?.lotes)) return json.data.lotes;
  return [];
}

async function apiGetAll(params = {}) {
  const res  = await fetchWithFallback(`${PRIMARY}${qs(params)}`, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Error al cargar lotes");

  const rawList = pickArrayFromApi(json);
  const list = rawList.map(fromApi);
  return ok(list); // ← SIEMPRE { data: Array }
}

async function apiGetById(id) {
  const res  = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Error al obtener lote");
  const row = json?.data ?? json;
  return ok(fromApi(row));
}

async function apiCreate(payload) {
  const res  = await fetchWithFallback(PRIMARY, { method: "POST", body: payload });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Error al crear lote");
  const row = json?.data ?? json;
  return ok(fromApi(row));
}

async function apiUpdate(id, payload) {
  const res  = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "PUT", body: payload });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Error al actualizar lote");
  const row = json?.data ?? json;
  return ok(fromApi(row));
}

async function apiDelete(id) {
  const res = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.message || "Error al eliminar lote");
  }
  return ok(true);
}

/* ------------------------------ EXPORTS ------------------------------ */
export function getAllLotes(params)   { return USE_MOCK ? mockGetAll(params)   : apiGetAll(params); }
export function getLoteById(id)       { return USE_MOCK ? mockGetById(id)      : apiGetById(id); }
export function createLote(payload)   { return USE_MOCK ? mockCreate(payload)  : apiCreate(payload); }
export function updateLote(id, data)  { return USE_MOCK ? mockUpdate(id, data) : apiUpdate(id, data); }
export function deleteLote(id)        { return USE_MOCK ? mockDelete(id)       : apiDelete(id); }
