// Contexto simple de autenticación.
// Acá guardo el usuario y si está logueado.
// Más adelante puedo cargar /auth/me y roles reales. Todavia no lo hice

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAccessToken, setTokens, clearTokens } from '../../lib/auth/token';

const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  // Usuario actual (null si no hay sesión)
  const [user, setUser] = useState(null);
  // Flag de inicio (me sirve si después llamo a /auth/me)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si hay token, marco sesión como activa (placeholder)
    if (getAccessToken() && !user) {
      setUser({ id: 'placeholder', name: 'Usuario', roles: [] });
    }
    setLoading(false);
  }, []);

  // Simulo login: guardo tokens y perfil que me pase el back
  const login = async ({ access, refresh, profile }) => {
    setTokens({ access, refresh });
    setUser(profile ?? { id: 'me', name: 'Usuario', roles: [] });
  };

  // Cierro sesión: limpio tokens y usuario
  const logout = () => {
    clearTokens();
    setUser(null);
  };

  // Expongo todo lo que necesito en la app
  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      setUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook corto para leer auth en cualquier componente
export function useAuth() {
  return useContext(AuthContext);
}
