// Si todavía estoy cargando la sesión -> muestro spinner.
// Si no estoy autenticado -> mando a /login.
// Si ok -> dejo pasar a las rutas hijas (<Outlet/>).
// si loading → null (evito parpadeo)

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return children;
}

