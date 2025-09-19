// Cliente HTTP con Authorization + refresh automático.
// - Si el access vence (401 o body "Token expirado"), llama /auth/refresh.
// - Soporta refresh via cookie (credentials: 'include') o body.
// - Reintenta UNA vez la request original con el nuevo access.
// - Comentarios concisos para mantenimiento.

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "../auth/token";

const API_BASE     = import.meta.env.VITE_API_BASE_URL || "";
const LOGIN_PATH   = import.meta.env.VITE_AUTH_LOGIN_PATH || "/auth/login";
const REFRESH_PATH = import.meta.env.VITE_AUTH_REFRESH_PATH || "/auth/refresh";

// Evita múltiples refresh en paralelo
let refreshingPromise = null;

// --- arma URL absoluta (acepta path absoluto o relativo)
function absUrl(path) {
  const isAbs = typeof path === "string" && /^https?:\/\//i.test(path);
  return isAbs ? path : `${API_BASE}${path}`;
}

// --- hace fetch con headers JSON + Authorization opcional
async function doFetch(url, { method, headers, body, access, ...rest }) {
  const baseHeaders = {
    "Content-Type": "application/json",
    ...(headers || {}),
    ...(access ? { Authorization: `Bearer ${access}` } : {}),
  };
  return fetch(url, {
    method,
    headers: baseHeaders,
    body: body != null ? JSON.stringify(body) : undefined,
    credentials: "include", // por si el back usa cookie httpOnly para refresh
    ...rest,
  });
}

// --- llama refresh y guarda tokens (acepta ruta absoluta o relativa)
async function refreshTokens() {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("NoRefreshToken");

  if (refreshingPromise) return refreshingPromise;

  const refreshUrl = absUrl(REFRESH_PATH);

  // cubro variantes comunes del back: Authorization y body con varias keys
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${refresh}` };
  const body = { refreshToken: refresh, token: refresh };

  refreshingPromise = fetch(refreshUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    credentials: "include",
  })
    .then(async (res) => {
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.message || json?.error || `RefreshFail(${res.status})`;
        throw new Error(msg);
      }
      // nombres posibles que devuelva el back
      const access  = json.accessToken  ?? json.access  ?? json.token;
      const refresh = json.refreshToken ?? json.refresh ?? null;
      if (!access) throw new Error("NoAccessAfterRefresh");
      setTokens({ access, refresh });
      return { access, refresh };
    })
    .finally(() => {
      refreshingPromise = null;
    });

  return refreshingPromise;
}

// --- export principal
export async function http(path, { method = "GET", headers = {}, body, ...rest } = {}) {
  const url = absUrl(path);
  const access = getAccessToken();

  // 1) primer intento
  let res = await doFetch(url, { method, headers, body, access, ...rest });

  // ¿es endpoint de auth? (no refresco sobre login/refresh)
  const isAuthPath =
    path === LOGIN_PATH ||
    path === REFRESH_PATH ||
    url.endsWith(LOGIN_PATH) ||
    url.endsWith(REFRESH_PATH);

  // 2) si NO es 401, devuelvo tal cual
  if (res.status !== 401 && !isAuthPath) {
    // extra: algunos back devuelven 200 con {success:false,"Token expirado"}
    // lo detecto leyendo un clone para no consumir el stream
    try {
      const clone = res.clone();
      const json = await clone.json();
      const tokenExpired =
        json && json.success === false && /token\s*expirado/i.test(String(json.error || ""));
      if (!tokenExpired) return res;
      // si el body dice "Token expirado", fuerzo refresh
    } catch {
      return res; // no era JSON => devuelvo
    }
  } else if (res.status !== 401 || isAuthPath) {
    // 401 pero sobre /auth o no-401 => devuelvo
    return res;
  }

  // 3) intento refresh y reintento 1 sola vez
  try {
    const { access: newAccess } = await refreshTokens();
    res = await doFetch(url, { method, headers, body, access: newAccess, ...rest });
    return res;
  } catch (e) {
    clearTokens();
    window.location.assign('/login?expired=1'); // forzar login
    // Refresh falló: limpio tokens opcionalmente y devuelvo el 401 original
    // clearTokens(); // si querés forzar logout automático, descomenta
    return res;
  }
}

// -------------------------------------------------------------
// NORMALIZADORES Y HELPERS
// -------------------------------------------------------------

/**
 * Normaliza respuestas de "lista" a un array, sin importar el envoltorio.
 * ACEPTA:   [ ... ]
 *           { data: [ ... ] }
 *           { success: true, data: [ ... ] }
 *           { data: { items: [ ... ], total: N, ... } }
 * DEVUELVE: siempre un array (o [] en fallback seguro)
 * Esto para que la intefaz no tenga que cambiar la interpretacion de lo que viene
 * lo ideal seria que sea todo parecido lo que devuelva el back, luego habria que modificar.
 */
export function normalizeApiListResponse(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.items)) return json.data.items;
  // algunos back devuelven {rows:[...]} o {result:[...]} -> soporte básico
  if (Array.isArray(json?.rows)) return json.rows;
  if (Array.isArray(json?.result)) return json.result;
  return [];
}

/**
 * Envuelve http() y retorna el JSON parseado (o {} si no es json).
 * Por qué: en servicios del front queremos directamente el body, osea la info.
 */
export async function httpJson(path, opts) {
  const res = await http(path, opts);
  // si el back devolvió 204 o no-json, devolvemos objeto vacío
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; }
  catch { return {}; }
}

/**
 * Obtiene "listas" de cualquier endpoint y devuelve SIEMPRE un array.
 */
export async function getList(path, opts) {
  const json = await httpJson(path, opts);
  return normalizeApiListResponse(json);
}
