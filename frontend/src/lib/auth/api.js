// Acá concentro las llamadas de auth al backend.
// Si mañana cambian paths o payloads, solo toco este archivo.

// Si VITE_AUTH_USE_MOCK=true uso mocks; si no, pego al backend real.
const USE_MOCK = import.meta.env.VITE_AUTH_USE_MOCK === 'true';

import { http } from '../http/http';
import { getAccessToken } from './token';

const LOGIN_PATH   = import.meta.env.VITE_AUTH_LOGIN_PATH   || '/auth/login';
const ME_PATH      = import.meta.env.VITE_AUTH_ME_PATH      || '/auth/me';

// --------- API PÚBLICA (el resto de la app importa estas dos) ---------

// Hago login con email + password. Devuelvo el JSON (tokens + user).
export async function apiLogin({ email, password }) {
  if (USE_MOCK) return mockLogin({ email, password });

  // Backend real
  const res = await http(LOGIN_PATH, { method: 'POST', body: { email, password } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || 'Error en login';
    throw new Error(msg);
  }
  return data;
}

// Traigo el usuario actual (debe venir el access en Authorization)
export async function apiMe() {
  if (USE_MOCK) return mockMe();

  // Backend real
  const res = await http(ME_PATH, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || 'Error al cargar sesión';
    throw new Error(msg);
  }
  return data;
}

// --------- MOCKS (solo se usan si USE_MOCK === true) ---------

// Dejo 4 usuarios de ejemplo (roles Prisma). Password plano SOLO para dev.
const MOCK_USERS = [
  { id: 1, email: 'admin@lf.com',       username: 'admin',  password: '123456', role: 'ADMINISTRADOR', inmobiliariaId: null },
  { id: 2, email: 'tecnico@lf.com',     username: 'tec',    password: '123456', role: 'TECNICO',       inmobiliariaId: null },
  { id: 3, email: 'gestor@lf.com',      username: 'gestor', password: '123456', role: 'GESTOR',        inmobiliariaId: null },
  { id: 4, email: 'inmo@lf.com',        username: 'inmo1',  password: '123456', role: 'INMOBILIARIA',  inmobiliariaId: 101 },
];

// Armo una vista pública del usuario (no expongo password)
function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

// Genero tokens mock que incluyen el userId (me sirve para /me)
function buildTokens(userId) {
  return {
    accessToken:  `mock-access:${userId}`,
    refreshToken: `mock-refresh:${userId}`,
  };
}

// Login mock: busco por email y comparo password
async function mockLogin({ email, password }) {
  const user = MOCK_USERS.find(u => u.email === email);
  if (!user || user.password !== password) {
    // Simulo formato de error común
    throw new Error('Credenciales inválidas');
  }
  const tokens = buildTokens(user.id);
  return {
    data: {
      user: publicUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  };
}

// Me mock: leo el userId del access token guardado
async function mockMe() {
  const at = getAccessToken();
  // Espero formato "mock-access:<id>"
  const id = Number(at?.split(':')[1] ?? NaN);
  const user = MOCK_USERS.find(u => u.id === id);
  if (!user) throw new Error('No hay sesión');
  return { data: { user: publicUser(user) } };
}
