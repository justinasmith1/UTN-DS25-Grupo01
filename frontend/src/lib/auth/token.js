// Centralizo el manejo de tokens. Uso localStorage por simpleza.
// Claves configurables vía .env o valores por defecto.

const ACCESS_KEY  = import.meta.env.VITE_AUTH_TOKEN_KEY || "lf_token";
const REFRESH_KEY = import.meta.env.VITE_AUTH_REFRESH_TOKEN_KEY || "lf_refresh";

// === Lectura ===
// Leo el access token para la cabecera Authorization
export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

// Leo el refresh token para renovar sesión
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

// === Escritura (exports que esperaba api.js) ===
// Guardo SOLO el access token
export function setAccessToken(token) {
  if (typeof token === "string") localStorage.setItem(ACCESS_KEY, token);
}

// Guardo SOLO el refresh token
export function setRefreshToken(token) {
  if (typeof token === "string") localStorage.setItem(REFRESH_KEY, token);
}

// Helper opcional: guardar ambos a la vez
export function setTokens({ access, refresh } = {}) {
  if (access)  setAccessToken(access);
  if (refresh) setRefreshToken(refresh);
}

// === Limpieza ===
// Borro ambos tokens (logout)
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
