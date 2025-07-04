// src/pages/Dashboard.jsx
"use client" // permite hooks en entornos que lo requieran

import { useOutletContext } from "react-router-dom";
import { Container, Card, Table, Badge, Button, Dropdown } from "react-bootstrap"

const customStyles = `
  .brand-gray { 
    background-color: #f0f0f0 !important; 
  }
  .text-brand-dark-green { 
    color: #0b3d23 !important; 
  }
  .border-brand-dark-green { 
    border-color: #0b3d23 !important; 
  }
  .table-row-hover:hover { 
    background-color: rgba(230, 239, 233, 0.5) !important; 
    transition: all 0.15s ease;
  }
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
  }
  .status-dot-disponible { background-color: #28a745; }
  .status-dot-nodisponible { background-color: #dc3545; }
  .status-dot-vendido { background-color: #007bff; }
  .action-btn {
    border-radius: 8px !important;
    transition: all 0.15s ease;
  }
  .action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`

export default function Dashboard() {
  // Recibe todo desde Layout con este "gancho"
  // Obtiene lista de lotes y funciones de acción
  const { lots, handleStatusChange, handleDeleteLot, handleViewDetail } = useOutletContext();

  // Asigna clase de color al punto según el estado del lote
  const getStatusDotClass = (status) => {
    switch (status) {
      case "Disponible":
        return "status-dot-disponible"
      case "Vendido":
        return "status-dot-vendido"
      case "No Disponible":
        return "status-dot-nodisponible"
      default:
        return "bg-secondary"
    }
  }

  // Devuelve la variante de Badge según el sub-estado del lote
const getSubStatusVariant = (subStatus) => {
  switch (subStatus) {
    case "En Venta":
      return "success"
    case "Reservado":
      return "warning"
    case "Alquilado":
      return "info"
    case "En Construccion":
      return "secondary"
    case "Construido":
      return "dark"
    case "No Construido":
      return "light"
    default:
      return "primary"
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
                  <th className="p-3">Sub-Estado</th>
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
                          {["Disponible", "Vendido", "No Disponible"].map((status) => (
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
                    </td>
                    <td className="p-3">
                      <Badge
                        bg={getSubStatusVariant(lot.subStatus)}
                        className="px-3 py-2"
                        style={{ borderRadius: "12px" }}
                      >
                        {lot.subStatus}
                      </Badge>
      
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline-success"
                        className="border-brand-dark-green text-brand-dark-green px-3 py-2"
                        style={{ borderRadius: "12px" }}
                      >
                        {lot.owner}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <small className="text-muted">{lot.location}</small>
                    </td>
                    <td className="p-3">
                      <div className="d-flex gap-1 flex-wrap">
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="action-btn"
                          onClick={() => alert(`Registrar venta ${lot.id}`)}
                        >
                          Registrar venta
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="action-btn"
                          onClick={() => handleViewDetail(lot.id)}
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          className="action-btn"
                          onClick={() => alert(`Editar ${lot.id}`)}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="action-btn"
                          onClick={() => handleDeleteLot(lot.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
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
  )
}