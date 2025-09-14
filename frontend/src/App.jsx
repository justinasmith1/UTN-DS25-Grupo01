// src/App.jsx
// Defino rutas. El único <BrowserRouter> está en main.jsx.

import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Map from "./pages/Map";
import Login from "./pages/Login";
import ProtectedRoute from "./app/routes/ProtectedRoute";
import RequireRole from "./app/routes/RequireRole";
import { PERMISSIONS } from "./lib/auth/rbac";
import Reservas from "./pages/Reservas";

// Iconos (ok tenerlos acá)
import "bootstrap-icons/font/bootstrap-icons.css";

export default function App() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<Login />} />

      {/* Privadas: ProtectedRoute renderiza <Outlet /> */}
      <Route element={<ProtectedRoute />}>
        {/* Layout padre (acá vive el <Outlet /> de las páginas) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<Map />} />
          <Route
            path="reservas"
            element={
              <RequireRole permission={PERMISSIONS.RES_ACCESS}>
                <Reservas />
              </RequireRole>
            }
          />
        </Route>
      </Route>

      {/* Catch-all: si la ruta no existe, vuelvo a la home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
