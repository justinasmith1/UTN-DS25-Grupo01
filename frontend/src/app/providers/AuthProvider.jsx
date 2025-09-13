// Manejo la sesión desde acá: login real, usuario actual y logout.
// Por ahora NO hago refresh token. Eso lo agrego en el siguiente paso.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAccessToken, setTokens, clearTokens } from '../../lib/auth/token';
import { apiLogin, apiMe } from '../../lib/auth/api';

const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  // Usuario logueado (null si no hay sesión)
  const [user, setUser] = useState(null);
  // Flag de arranque (evito parpadeos)
  const [loading, setLoading] = useState(true);

  // Normalizo el usuario que viene del back a mi shape
  const normalizeUser = (raw) => {
    if (!raw) return null;
    const singleRole = raw.role; // Prisma enum: ADMINISTRADOR | TECNICO | GESTOR | INMOBILIARIA
    return {
      ...raw,
      // Guardo roles como array para unificar el consumo en front
      roles: Array.isArray(raw.roles) ? raw.roles : (singleRole ? [singleRole] : []),
    };
  };


  // Al montar, si hay token intento obtener /auth/me
  useEffect(() => {
    const boot = async () => {
      try {
        if (getAccessToken()) {
          const me = await apiMe();
          // Normalizo el shape del usuario (me adapto a data.user o user)
          const profile = me?.data?.user ?? me?.user ?? me;
          setUser(normalizeUser(profile) || { name: 'Usuario' });
        } else {
          setUser(null);
        }
      } catch {
        // Si falla me() limpio sesión para empezar “desde cero”
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  // Hago login contra el back y guardo tokens + usuario
  const signIn = async ({ email, password }) => {
    // Llamo al endpoint de login
    const resp = await apiLogin({ email, password });

    // Extraigo tokens con nombres flexibles (me adapto a varias respuestas)
    const access =
      resp?.data?.accessToken ?? resp?.accessToken ?? resp?.token ?? null;
    const refresh =
      resp?.data?.refreshToken ?? resp?.refreshToken ?? null;

    // Guardo tokens si existen
    if (access || refresh) setTokens({ access, refresh });

    // Intento traer el perfil real
    let profile = resp?.data?.user ?? resp?.user ?? null;
    if (!profile) {
      try {
        const me = await apiMe();
        profile = me?.data?.user ?? me?.user ?? me ?? null;
      } catch {
        profile = null;
      }
    }
    setUser(normalizeUser(profile) || { name: 'Usuario' });
  };

  // Cierro sesión
  const logout = () => {
    clearTokens();
    setUser(null);
  };

  // Expongo lo que necesito en el resto de la app
  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      signIn,
      logout,
      setUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook para consumir auth
export function useAuth() {
  return useContext(AuthContext);
}
