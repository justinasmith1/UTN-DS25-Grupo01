// Si no hay permiso, muestro 403 (mensaje simple) en lugar de dejar la pantalla en blanco.

import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { can } from "../../lib/auth/rbac";

export default function RequireRole({ permission, children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return null;                 // El padre (ProtectedRoute) ya muestra spinner
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!permission || can(user, permission)) return children;

  // 403 simple y visible (evita pantalla en blanco)
  return (
    <div className="container py-4">
      <h5 className="mb-2">403 – No tenés permiso</h5>
      <p className="text-muted m-0">Consultá con un administrador si esto es un error.</p>
    </div>
  );
}
