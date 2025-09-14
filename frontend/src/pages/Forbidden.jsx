// Página 403 simple y clara.
// Objetivo: cuando el usuario está logueado pero no tiene permiso, aterriza acá.
// Comentarios simples para que quede claro "qué hace" y "por qué".

import { Button } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";

export default function Forbidden() {
  const navigate = useNavigate();
  const location = useLocation();

  // Vuelvo a la página anterior o al inicio si no hay "from"
  const volver = () => {
    const from = location.state?.from || "/";
    navigate(from, { replace: true });
  };

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
      <div className="text-center">
        <h3 className="mb-2">403 — Sin permisos</h3>
        <p className="text-muted mb-4">
          Estás logueado, pero tu rol no tiene acceso a esta sección.
        </p>
        <Button variant="primary" onClick={volver}>
          Volver
        </Button>
      </div>
    </div>
  );
}
