// Guardia de rutas privadas.
// Si no hay sesión → me manda a /login y recuerdo de dónde venía.

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Espero a que AuthProvider termine su check inicial
  if (loading) return null;

  // Si no estoy logueado, redirijo a /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Si está todo ok, muestro la ruta privada
  return children;
}
