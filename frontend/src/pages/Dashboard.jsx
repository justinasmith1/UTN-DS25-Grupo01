// src/pages/Dashboard.jsx
// Listado principal de lotes con acciones. Acá aplico RBAC en UI:
// - Envuelo botones/acciones con <Can permission="...">
// - Si no tengo permiso para editar el estado, muestro el estado como Badge (solo lectura)

"use client"; // Habilito hooks en entornos que lo requieran (no afecta Vite)

// Importo el guard de UI y el listado de permisos canónicos
import Can from "../components/Can"
import { PERMISSIONS } from "../lib/auth/rbac";

import { useOutletContext } from "react-router-dom";
import { Container, Card, Table, Badge, Button, Dropdown, Spinner } from "react-bootstrap";

// Estilos mínimos locales (no toco tus CSS globales)
const customStyles = `
  .brand-gray { background-color: #f0f0f0 !important; }
  .text-brand-dark-green { color: #0b3d23 !important; }
  .border-brand-dark-green { border-color: #0b3d23 !important; }
  .table-row-hover:hover { background-color: rgba(230, 239, 233, 0.5) !important; transition: all 0.15s ease;}
  .status-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px; }
  .status-dot-disponible { background-color: #28a745; }
  .status-dot-nodisponible { background-color: #dc3545; }
  .status-dot-vendido { background-color: #007bff; }
  .status-dot-reservado { background-color: #ffff00; }
  .status-dot-alquilado { background-color: #ff8000; }
  .action-btn { border-radius: 8px !important; transition: all 0.15s ease; }
  .action-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
`;

export default function Dashboard() {
  // Consumo el contexto expuesto por Layout: lotes + handlers
  const {
    lots,
    loadingLots,
    handleStatusChange,
    handleViewDetail,
    abrirModalEditar,
    abrirModalEliminar,
  } = useOutletContext();

    if (loadingLots) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <Spinner animation="border" role="status" />
        <span className="ms-2">Cargando…</span>
      </div>
    );
  }

  // Asigno la clase del "punto" de estado (color semafórico)
  function getStatusDotClass(status) {
    switch (status) {
      case "Disponible":
        return "status-dot-disponible";
      case "Vendido":
        return "status-dot-vendido";
      case "No Disponible":
        return "status-dot-nodisponible";
      case "Reservado":
        return "status-dot-reservado";
      case "Alquilado":
        return "status-dot-alquilado";
      default:
        return "bg-secondary";
    }
  }

  // Selecciono variante de Badge para el sub-estado
  function getSubStatusVariant(subStatus) {
    switch (subStatus) {
      case "En Construccion":
        return "warning";
      case "Construido":
        return "success";
      case "No Construido":
        return "danger";
      default:
        return "primary";
    }
  }

  return (
    <>
      <style>{customStyles}</style>
      <Container className="py-4">
        <Card style={{ borderRadius: "12px", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}>
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0">
              <thead className="brand-gray">
                <tr>
                  <th width="50" className="p-3"></th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Estado-Plano</th>
                  <th className="p-3">Propietario</th>
                  <th className="p-3">Ubicación</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className="table-row-hover">
                    <td className="p-3">
                      <div className={`status-dot ${getStatusDotClass(lot.status)}`}></div>
                    </td>

                    <td className="p-3">
                      <Badge bg="light" text="dark" className="px-3 py-2" style={{ borderRadius: "12px" }}>
                        {lot.id}
                      </Badge>
                    </td>

                    <td className="p-3">
                      {/* Si tengo permiso de editar lote, muestro el dropdown; si no, solo el estado como Badge */}
                      <Can
                        permission={PERMISSIONS.LOT_EDIT}
                        fallback={
                          <Badge bg="light" text="dark" className="px-3 py-2" style={{ borderRadius: "12px" }}>
                            {lot.status}
                          </Badge>
                        }
                      >
                        <Dropdown>
                          <Dropdown.Toggle
                            variant="outline-secondary"
                            size="sm"
                            className="action-btn"
                            style={{ minWidth: "140px" }}
                          >
                            {lot.status}
                          </Dropdown.Toggle>
                          <Dropdown.Menu style={{ borderRadius: "12px" }}>
                            {["Disponible", "Vendido", "No Disponible", "Reservado", "Alquilado"].map((status) => (
                              <Dropdown.Item
                                key={status}
                                onClick={() => handleStatusChange(lot.id, status)}
                                style={{ transition: "all 0.15s ease" }}
                              >
                                {status}
                              </Dropdown.Item>
                            ))}
                          </Dropdown.Menu>
                        </Dropdown>
                      </Can>
                    </td>

                    <td className="p-3">
                      <Badge bg={getSubStatusVariant(lot.subStatus)} className="px-3 py-2" style={{ borderRadius: "12px" }}>
                        {lot.subStatus}
                      </Badge>
                    </td>

                    <td className="p-3">
                      <Badge
                        bg="light"
                        text="dark"
                        className="border-brand-dark-green px-3 py-2"
                        style={{ borderRadius: "12px", borderWidth: 1, borderStyle: "solid" }}
                      >
                        {lot.owner}
                      </Badge>
                    </td>

                    <td className="p-3">
                      <small className="text-muted">{lot.location}</small>
                    </td>

                    <td className="p-3">
                      <div className="d-flex gap-1 flex-wrap">
                        {/* Registrar venta: solo Admin */}
                        <Can permission={PERMISSIONS.SALE_CREATE}>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="action-btn"
                            onClick={() => alert(`Registrar venta ${lot.id}`)}
                          >
                            Registrar venta
                          </Button>
                        </Can>

                        {/* Ver detalle: lo dejo visible para todos los roles */}
                        <Can permission={PERMISSIONS.LOT_DETAIL}>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="action-btn"
                            onClick={() => handleViewDetail(lot.id)}
                          >
                            <i className="bi bi-eye"></i>
                          </Button>
                        </Can>

                        {/* Editar lote: Admin, Técnico, Gestor */}
                        <Can permission={PERMISSIONS.LOT_EDIT}>
                          <Button
                            variant="outline-warning"
                            size="sm"
                            className="action-btn"
                            onClick={() => abrirModalEditar(lot)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                        </Can>

                        {/* Eliminar lote: solo Admin */}
                        <Can permission={PERMISSIONS.LOT_DELETE}>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="action-btn"
                            onClick={() => abrirModalEliminar(lot)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Mensaje vacío cuando no hay resultados */}
            {lots.length === 0 && (
              <div className="text-center py-5">
                <i className="bi bi-info-circle text-muted" style={{ fontSize: "2rem" }}></i>
                <p className="text-muted mt-3 mb-0">No se encontraron lotes que coincidan con los filtros aplicados.</p>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}
