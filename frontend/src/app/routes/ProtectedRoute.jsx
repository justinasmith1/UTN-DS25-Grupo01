// Ruta protegida canónica: si no hay sesión, navega a /login y
// si hay sesión, renderiza el <Outlet/> (lo que cuelgue debajo).

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

// Nota: este ProtectedRoute NO recibe children.
// Siempre usa <Outlet /> para renderizar lo que esté anidado.
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras cargo sesión, muestro algo simple nada rarou
  if (loading) {
    return <div style={{ padding: 24 }}>Cargando sesión…</div>;
  }

  // Si no hay usuario, redirijo a /login guardando desde dónde venía
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Si hay usuario, dejo pasar al contenido anidado
  return <Outlet />;
}
