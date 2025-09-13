// Defino rutas. Login es publica porque es la de inicio para
// que luego haga la autenticacion. El resto va bajo ProtectedRoute.
// IMPORTANTE: aca NO uso <BrowserRouter>; eso queda en main.jsx. Cambio importante.

import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Map from "./pages/Map";
import Login from "./pages/Login";
import ProtectedRoute from "./app/routes/ProtectedRoute";
// Importo aca los iconos, antes estaba en main
import "bootstrap-icons/font/bootstrap-icons.css";

export default function App() {
  return (
    <Routes>
      {/* Ruta pública: puedo entrar sin sesion */}
      <Route path="/login" element={<Login />} />

      {/* Rutas privadas: si no tengo sesion, me mandan a /login */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<Dashboard />} />
        {/* Mapa */}
        <Route path="map" element={<Map />} />
      </Route>

      {/* Fallback simple, esto es para rutas no encontradas */}
      <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />
    </Routes>
  );
}
