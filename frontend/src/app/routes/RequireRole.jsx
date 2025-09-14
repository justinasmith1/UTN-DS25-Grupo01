// Guardia de permisos por ruta.
// Si no hay sesión → /login.
// Si hay sesión pero falta permiso → /403.
// Mantengo los comentarios cortos y claros.

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { can } from "../../lib/auth/rbac";

export default function RequireRole({ permission, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras cargo usuario, no renderizo nada (evito parpadeos)
  if (loading) return null;

  // Si no hay sesión, mando a login y guardo de dónde venía
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Si hay sesión pero no tiene permiso, mando a 403
  if (permission && !can(user, permission)) {
    return <Navigate to="/403" replace state={{ from: location.pathname }} />;
  }

  // Si pasa, muestro el contenido protegido
  return children;
}


