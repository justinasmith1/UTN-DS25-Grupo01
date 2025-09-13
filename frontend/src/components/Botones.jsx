// src/components/Botones.jsx
// Barra de módulos. Muestro cada tab según permiso del rol.
// Ventas (SALE_ACCESS) | Inmobiliarias (AGENCY_ACCESS) | Personas (PEOPLE_ACCESS) | Reservas (RES_ACCESS) | Reportes (REPORTS_ACCESS)

import { Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

// Leo usuario y permisos
import { useAuth } from "../app/providers/AuthProvider";         // usa la misma ruta que en tus otros imports
import { can } from "../lib/auth/rbac";
import { PERMISSIONS } from "../lib/auth/rbac";

const customStyles = `
  .brand-dark-green { background-color: #0b3d23 !important; border-color: #0b3d23 !important; color: white !important; }
  .brand-dark-green:hover { background-color: rgba(11,61,35,.8) !important; border-color: rgba(11,61,35,.8) !important; }
  .category-btn { border-radius: 12px !important; font-size: .875rem; padding: .5rem 1rem !important; }
`;

export default function Botones() {
  const navigate = useNavigate();

  // Usuario actual (para chequear permisos)
  const { user } = useAuth();

  // Defino los módulos con su permiso y (si aplica) a dónde navega
  const modules = [
    { label: "Ventas",         perm: PERMISSIONS.SALE_ACCESS,    to: null }, // (cuando haya ruta: to: "/ventas")
    { label: "Inmobiliarias",  perm: PERMISSIONS.AGENCY_ACCESS,  to: null }, // to: "/inmobiliarias"
    { label: "Personas",       perm: PERMISSIONS.PEOPLE_ACCESS,  to: null }, // to: "/personas"
    { label: "Reservas",       perm: PERMISSIONS.RES_ACCESS,     to: null }, // to: "/reservas"
    { label: "Reportes",       perm: PERMISSIONS.REPORTS_ACCESS, to: null }, // to: "/reportes"
  ];

  // Filtro solo los que el usuario puede ver (si tenés el flag VITE_RBAC_DISABLE_UI=true, <Can> ya no oculta nada)
  const visibleModules = modules.filter((m) => can(user, m.perm));

  function handleClick(mod) {
    // Si después definimos rutas, navego; por ahora puede quedar sin acción
    if (mod.to) navigate(mod.to);
  }

  return (
    <>
      <style>{customStyles}</style>

      <div className="py-2">
        <Container>
          <Row>
            <Col>
              <div className="d-flex gap-3 flex-wrap">
                {visibleModules.map((mod) => (
                  <Button
                    key={mod.label}
                    className="brand-dark-green category-btn"
                    onClick={() => handleClick(mod)}
                    title={mod.label}
                  >
                    {mod.label}
                  </Button>
                ))}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
}
