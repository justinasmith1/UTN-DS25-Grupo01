// src/lib/api/lotes.js
// Adapter único para LOTES. Traduce entre el contrato del BACK y el shape que la UI ya consume.
// Objetivo: NO tocar Dashboard/Layout/SidePanel/LotInfo al cambiar el back.

const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === "true";
import { http, normalizeApiListResponse } from "../http/http"; // usa Authorization y maneja 401/refresh

const PRIMARY = "/lotes";
const FALLBACK = "/lotes";

const ok = (data) => ({ data });

const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
const strOrNull = (v) => (v == null ? null : String(v));

// --------------------------- MAPEO BACK -> UI ---------------------------
function fromApi(x = {}) {
  const id = strOrNull(x.id ?? x.loteId ?? x.Id) ?? `${x.manzana ?? "?"}-${x.numero ?? "?"}`;
  const status = x.status ?? x.estado ?? null;
  const subStatus = x.subStatus ?? x.subEstado ?? x.estadoPlano ?? null;
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
    status,
    subStatus,
    owner,
    location,
    surface: numOrNull(x.surface ?? x.superficieM2 ?? x.superficie),
    price: numOrNull(x.price ?? x.precio),
    images: Array.isArray(x.images ?? x.imagenes) ? (x.images ?? x.imagenes) : [],
    ...x,
  };
}

// --------------------------- MAPEO UI -> BACK ---------------------------
function toApi(payload = {}) {
  const out = { ...payload };

  if (out.status !== undefined && out.estado === undefined) {
    out.estado = typeof out.status === "string" ? out.status : out.status;
    delete out.status;
  }

  if (out.subStatus !== undefined && out.subEstado === undefined && out.estadoPlano === undefined) {
    out.subEstado = out.subStatus;
    delete out.subStatus;
  }

  if (out.owner !== undefined && out.propietarioId === undefined) {
    out.propietarioId =
      typeof out.owner === "object" && out.owner !== null ? out.owner.id : out.owner;
    delete out.owner;
  }

  if (out.location !== undefined) delete out.location;

  if (out.surface !== undefined && out.superficieM2 === undefined) {
    out.superficieM2 = numOrNull(out.surface);
    delete out.surface;
  }
  if (out.price !== undefined && out.precio === undefined) {
    out.precio = numOrNull(out.price);
    delete out.price;
  }

  if (out.manzana !== undefined) out.manzana = strOrNull(out.manzana);
  if (out.numero !== undefined) out.numero = numOrNull(out.numero);
  if (out.reservaId !== undefined) out.reservaId = strOrNull(out.reservaId);
  if (out.observaciones !== undefined) {
    out.observaciones = (out.observaciones ?? "").trim() || null;
  }

  return out;
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
  return { data, meta: { total, page, pageSize } };
}
async function mockGetById(id)      { ensureSeed(); const f = LOTES.find(l => String(l.id) === String(id)); if (!f) throw new Error("Lote no encontrado"); return ok(fromApi(f)); }
async function mockCreate(payload)   { ensureSeed(); const row = toApi(payload); row.id = nextId(); LOTES.unshift(row); return ok(fromApi(row)); }
async function mockUpdate(id, p)     { ensureSeed(); const i = LOTES.findIndex(l => String(l.id) === String(id)); if (i < 0) throw new Error("Lote no encontrado"); LOTES[i] = { ...LOTES[i], ...toApi(p) }; return ok(fromApi(LOTES[i])); }
async function mockDelete(id)        { ensureSeed(); const n = LOTES.length; LOTES = LOTES.filter(l => String(l.id) !== String(id)); if (LOTES.length === n) throw new Error("Lote no encontrado"); return ok(true); }

/* ================================ API REAL ================================ */
async function apiGetAll(params = {}) {
  const res  = await fetchWithFallback(`${PRIMARY}${qs(params)}`, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Error al cargar lotes");

  const list = normalizeApiListResponse(json);
  return ok(list.map(fromApi));
}

async function apiGetById(id) {
  const res  = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "GET" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Error al obtener lote");
  return ok(fromApi(json?.data ?? json));
}

async function apiCreate(payload) {
  const res  = await fetchWithFallback(PRIMARY, { method: "POST", body: toApi(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Error al crear lote");
  return ok(fromApi(json?.data ?? json));
}

async function apiUpdate(id, payload) {
  const res  = await fetchWithFallback(`${PRIMARY}/${id}`, { method: "PUT", body: toApi(payload) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Error al actualizar lote");
  return ok(fromApi(json?.data ?? json));
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
