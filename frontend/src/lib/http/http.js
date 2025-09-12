// Cliente HTTP básico con fetch.
// Armo la URL con API_BASE y agrego Authorization si tengo token.

import { getAccessToken } from '../auth/token';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function http(path, { method = 'GET', headers = {}, body, ...rest } = {}) {
  const token = getAccessToken();

  // Armo headers comunes + Authorization (si corresponde)
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Hago la request (body en JSON si me pasan objeto)
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  // Por ahora devuelvo el Response tal cual. (Refresh lo agrego luego)
  return res;
}
