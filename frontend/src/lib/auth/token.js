// Centralizo el manejo de tokens. Arranco simple con localStorage.
// En el próximo paso puedo pasar access a memoria y dejar refresh en storage.

const ACCESS_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY || 'lf_token'; // key para localStorage
const REFRESH_KEY = import.meta.env.VITE_AUTH_REFRESH_TOKEN_KEY || 'lf_refresh'; // key para localStorage

// Leo el access token para el Authorization
export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY); // Esto es para la cabecera Authorization
}

// Leo el refresh token (para renovar la sesión)
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY); // Esto es para pedir un nuevo access token
}

// Guardo ambos tokens 
export function setTokens({ access, refresh }) {
  if (typeof access === 'string') localStorage.setItem(ACCESS_KEY, access);   
  if (typeof refresh === 'string') localStorage.setItem(REFRESH_KEY, refresh);
}

// Limpio ambos tokens (LOGOUT)
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY); 
  localStorage.removeItem(REFRESH_KEY); 
}
