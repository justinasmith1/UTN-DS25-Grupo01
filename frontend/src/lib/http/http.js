// Cliente HTTP con soporte de Authorization y refresh en 401.
// Si el access vence, intento /auth/refresh UNA vez y reintento la request.

import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../auth/token';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const LOGIN_PATH = import.meta.env.VITE_AUTH_LOGIN_PATH || '/auth/login';
const REFRESH_PATH = import.meta.env.VITE_AUTH_REFRESH_PATH || '/auth/refresh';

// Mantengo un "lock" para evitar múltiples refresh en paralelo
let refreshingPromise = null;

// Llamo al endpoint de refresh y guardo nuevos tokens
async function refreshTokens() {
  // Si ya hay un refresh en curso, me cuelgo de esa promesa
  // Esto es por si varias requests fallan con 401 al mismo tiempo, raro igual pero por ahi pasa
  if (refreshingPromise) return refreshingPromise;

  const refresh = getRefreshToken();
  if (!refresh) throw new Error('No tengo refresh token');

  // Arranco un único refresh
  refreshingPromise = fetch(`${API_BASE}${REFRESH_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || data?.message || 'Error al refrescar sesión';
        throw new Error(msg);
      }
      // Extraigo tokens con nombres flexibles
      const access =
        data?.data?.accessToken ?? data?.accessToken ?? data?.token ?? null;
      const newRefresh =
        data?.data?.refreshToken ?? data?.refreshToken ?? null;

      // Guardo lo que venga (si no viene refresh, mantengo el anterior)
      setTokens({ access, refresh: newRefresh || refresh });
      return access;
    })
    .catch((err) => {
      // Si falla el refresh, tiro abajo la sesión
      clearTokens();
      throw err;
    })
    .finally(() => {
      refreshingPromise = null;
    });

  return refreshingPromise;
}

export async function http(
  path,
  { method = 'GET', headers = {}, body, ...rest } = {}
) {
  const isAbsolute = typeof path === 'string' && /^https?:\/\//i.test(path);
  const url = isAbsolute ? path : `${API_BASE}${path}`;

  const token = getAccessToken();

  // Armo headers estándar + Authorization si tengo token
  const baseHeaders = {
    'Content-Type': 'application/json',
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Hago la request
  const res = await fetch(url, {
    method,
    headers: baseHeaders,
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  // No intento refresh en login/refresh ni si no hay 401
  const isAuthPath = path === LOGIN_PATH || path === REFRESH_PATH;
  if (res.status !== 401 || isAuthPath) return res;

  try {
    // Intento refrescar sesión
    await refreshTokens();

    // Reintento la request con el nuevo access
    const newAccess = getAccessToken();
    const retryHeaders = {
      ...baseHeaders,
      ...(newAccess ? { Authorization: `Bearer ${newAccess}` } : {}),
    };

    return await fetch(url, {
      method,
      headers: retryHeaders,
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    });
  } catch {
    // Si el refresh falla, devuelvo el 401 original
    return res;
  }
}

