// Si todavía estoy cargando la sesión -> muestro spinner.
// Si no estoy autenticado -> mando a /login.
// Si ok -> dejo pasar a las rutas hijas (<Outlet/>).

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "react-bootstrap";
import { useAuth } from "../providers/AuthProvider";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <Spinner animation="border" role="status" />
        <span className="ms-2">Cargando sesión…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Guardo a dónde quería ir para volver después del login
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
