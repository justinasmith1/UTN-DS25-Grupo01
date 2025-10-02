// src/app/providers/AuthProvider.jsx
// Contexto de autenticación REAL (tokens + user persistido local).
// Expone: { user, loading, login, logout }

import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiLogin } from "../../lib/auth/api";
import { getAccessToken, clearTokens } from "../../lib/auth/token";

const AuthCtx = createContext(null);

// Clave donde vamos a guardar el user del login
const USER_KEY = "lf_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // objeto de usuario
  const [loading, setLoading] = useState(true); // true mientras intento recuperar sesión

  const navigate = useNavigate();
  const location = useLocation();

  // Al montar: si tengo access token, leo el user desde localStorage
  useEffect(() => {
    try {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const raw = localStorage.getItem(USER_KEY);
      const savedUser = raw ? JSON.parse(raw) : null;
      setUser(savedUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login real → guarda tokens (lo hace el adapter) y persiste user local para levantar tras refresh
  async function login({ email, password }) {
    if (!email || !password) throw new Error("Completá email y contraseña");

    try {
      const me = await apiLogin({ email, password });
      setUser(me);
      localStorage.setItem(USER_KEY, JSON.stringify(me || {}));

      const from = location.state?.from || "/";
      navigate(from, { replace: true });
    } catch (error) {
      // Si el error viene del backend (status 401, 403, etc.), es credenciales incorrectas
      if (error.status && (error.status === 401 || error.status === 403)) {
        throw new Error("Contraseña o email incorrecto");
      }
      // Re-lanzar otros errores (red, servidor, etc.)
      throw error;
    }
  }

  // Cerrar sesión → limpio tokens y user local
  function logout() {
    clearTokens();
    localStorage.removeItem(USER_KEY);
    setUser(null);
    navigate("/login", { replace: true });
  }

  const value = { user, loading, login, logout };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

export default AuthProvider;
