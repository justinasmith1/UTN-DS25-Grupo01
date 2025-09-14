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
import Ventas from "./pages/Ventas";
import Inmobiliarias from "./pages/Inmobiliarias";
import Personas from "./pages/Personas";
import Reportes from "./pages/Reportes";
import Forbidden from "./pages/Forbidden";

// Iconos (ok tenerlos acá)
import "bootstrap-icons/font/bootstrap-icons.css";
import Forbidden from "./pages/Forbidden";

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
            path="inmobiliarias"
            element={
              <RequireRole permission={PERMISSIONS.AGENCY_ACCESS}>
                <Inmobiliarias />
              </RequireRole>
            }
          />
          <Route
            path="ventas"
            element={
              <RequireRole permission={PERMISSIONS.SALE_ACCESS}>
                <Ventas />
              </RequireRole>
            }
          />
          <Route
            path="reservas"
            element={
              <RequireRole permission={PERMISSIONS.RES_ACCESS}>
                <Reservas />
              </RequireRole>
            }
          />
          <Route
            path="personas"
            element={
              <RequireRole permission={PERMISSIONS.PEOPLE_ACCESS}>
                <Personas />
              </RequireRole>
            }
          />
          <Route
            path="reportes"
            element={
              <RequireRole permission={PERMISSIONS.REPORTS_ACCESS}>
                <Reportes />
              </RequireRole>
            }
          />
        </Route>
        {/* Página 403: sin permisos */}
        <Route path="/403" element={<Forbidden />} />
      </Route>

      {/* Catch-all: si la ruta no existe, vuelvo a la home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
