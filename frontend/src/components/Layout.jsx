"use client"

import React, { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Container,
  Row,
  Col,
  Button,
  FormControl,
  Table,
  Badge,
  Dropdown,
  Offcanvas,
  Modal,
  Card,
  Tabs,
  Tab,
  Carousel,
} from "react-bootstrap"
import { mockLots, mockUser } from "../lib/data"
import Header from "./Header"
import Botones from "./Botones"
import FilterBar from "./FilterBar"
import SidePanel from "./SidePanel"
import User from "./User"

const customStyles = `
  .brand-dark-green { background-color: #0b3d23 !important; border-color: #0b3d23 !important; }
  .brand-pale-green { background-color: #e6efe9 !important; }
  .brand-accent-yellow { background-color: #ffd700 !important; color: #000 !important; }
  .text-brand-dark-green { color: #0b3d23 !important; }
  .border-brand-dark-green { border-color: #0b3d23 !important; }
  .navbar-brand-green { background-color: #0b3d23 !important; }
  .status-dot-disponible { background-color: #28a745; }
  .status-dot-vendido { background-color: #dc3545; }
  .status-dot-reservado { background-color: #ffc107; }
  .status-dot-construccion { background-color: #007bff; }
  .parcel-hover:hover { 
    border: 2px solid #ffd700 !important; 
    background-color: rgba(255, 215, 0, 0.3) !important;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
  }
  .table-row-hover:hover { background-color: rgba(230, 239, 233, 0.5) !important; }
  .sticky-top-custom { position: sticky; top: 0; z-index: 1020; }
  .map-container { height: 600px; position: relative; background-color: #e6efe9; }
  .parcel-overlay { 
    position: absolute; 
    width: 48px; 
    height: 48px; 
    border: 2px solid transparent; 
    cursor: pointer; 
    transition: all 0.15s ease;
  }
  .parcel-label {
    position: absolute;
    top: -32px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    opacity: 0;
    transition: all 0.15s ease;
  }
  .parcel-overlay:hover .parcel-label { opacity: 1; }
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
  }
`

export default function Layout({ children }) {
  const [selectedLotId, setSelectedLotId] = useState(null)
  const [showSidePanel, setShowSidePanel] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [filters, setFilters] = useState({
    search: "",
    owner: [],
    location: [],
    status: [],
    subStatus: [],
  })
  const [lotsData, setLotsData] = useState(mockLots)
  const [editingLot, setEditingLot] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const currentLot = lotsData.find((lot) => lot.id === selectedLotId) || null

  const getStatusDotClass = (status) => {
    switch (status) {
      case "Disponible":
        return "status-dot-disponible"
      case "Vendido":
        return "status-dot-vendido"
      case "Reservado":
        return "status-dot-reservado"
      case "En Construccion":
        return "status-dot-construccion"
      default:
        return "bg-secondary"
    }
  }

  const getSubStatusVariant = (subStatus) => {
    switch (subStatus) {
      case "En promoción":
        return "warning"
      case "Reservado":
        return "warning"
      case "Vendido":
        return "danger"
      default:
        return "success"
    }
  }

  const handleParcelClick = (lotId) => {
    setSelectedLotId(lotId)
    setShowSidePanel(true)
  }

  const handleCloseSidePanel = () => {
    setShowSidePanel(false)
    setSelectedLotId(null)
  }

  const handleUserClick = () => {
    setShowUserModal(true)
  }

  const handleViewDetail = (lotId) => {
    setSelectedLotId(lotId)
    setEditingLot(lotsData.find((lot) => lot.id === lotId))
    setShowDetailModal(true)
    setShowSidePanel(false)
  }

  const handleSaveLot = () => {
    if (editingLot) {
      setLotsData((prev) => prev.map((lot) => (lot.id === editingLot.id ? editingLot : lot)))
      setIsEditing(false)
      alert("Lote guardado exitosamente")
    }
  }

  const handleDeleteLot = (lotId) => {
    if (window.confirm("¿Está seguro de eliminar este lote?")) {
      setLotsData((prev) => prev.filter((lot) => lot.id !== lotId))
      alert("Lote eliminado")
    }
  }

  const filteredLots = lotsData.filter((lot) => {
    if (filters.search && !lot.id.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.owner.length > 0 && !filters.owner.includes(lot.owner)) return false
    if (filters.location.length > 0 && !filters.location.includes(lot.location || "")) return false
    if (filters.status.length > 0 && !filters.status.includes(lot.status)) return false
    if (filters.subStatus.length > 0 && !filters.subStatus.includes(lot.subStatus)) return false
    return true
  })

  const clearFilters = () => {
    setFilters({
      search: "",
      owner: [],
      location: [],
      status: [],
      subStatus: [],
    })
  }

  const toggleFilter = (category, value) => {
    setFilters((prev) => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter((v) => v !== value)
        : [...prev[category], value],
    }))
  }

  const handleAddRecord = () => {
    alert("Acción Añadir Nuevo Registro")
  }

  const handleApplyPromotion = () => {
    alert("Acción Aplicar Promoción")
  }

  const handleClearFilters = () => {
    setFilters({
      search: "",
      owner: [],
      location: [],
      status: [],
      subStatus: [],
    })
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-white">
      <style>{customStyles}</style>
      <Header onUserClick={handleUserClick} user={mockUser} />
      <Botones />
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onAddRecord={handleAddRecord}
        onApplyPromotion={handleApplyPromotion}
        onClearFilters={handleClearFilters}
      />

      <main className="flex-grow-1">
        {location.pathname === "/lotes" && (
          <Container className="py-4">
            <Card>
              <Card.Body className="p-0">
                <Table hover responsive>
                  <thead className="table-light">
                    <tr>
                      <th width="50"></th>
                      <th>ID</th>
                      <th>Estado</th>
                      <th>Sub-Estado</th>
                      <th>Propietario</th>
                      <th>Ubicación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLots.map((lot) => (
                      <tr key={lot.id} className="table-row-hover">
                        <td>
                          <div className={`status-dot ${getStatusDotClass(lot.status)}`}></div>
                        </td>
                        <td>
                          <Badge bg="light" text="dark">
                            {lot.id}
                          </Badge>
                        </td>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle variant="outline-secondary" size="sm">
                              {lot.status}
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              {["Disponible", "Vendido", "Reservado", "En Construccion"].map((status) => (
                                <Dropdown.Item
                                  key={status}
                                  onClick={() => {
                                    setLotsData((prev) => prev.map((l) => (l.id === lot.id ? { ...l, status } : l)))
                                  }}
                                >
                                  {status}
                                </Dropdown.Item>
                              ))}
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                        <td>
                          <Badge bg={getSubStatusVariant(lot.subStatus)}>{lot.subStatus}</Badge>
                        </td>
                        <td>
                          <Badge variant="outline-success">{lot.owner}</Badge>
                        </td>
                        <td>
                          <small className="text-muted">{lot.location}</small>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => alert(`Registrar venta ${lot.id}`)}
                            >
                              Registrar venta
                            </Button>
                            <Button variant="outline-primary" size="sm" onClick={() => handleViewDetail(lot.id)}>
                              <i className="bi bi-eye"></i>
                            </Button>
                            <Button variant="outline-warning" size="sm" onClick={() => alert(`Editar ${lot.id}`)}>
                              <i className="bi bi-pencil"></i>
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleDeleteLot(lot.id)}>
                              <i className="bi bi-trash"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {filteredLots.length === 0 && (
                  <div className="text-center py-5">
                    <p className="text-muted">No se encontraron lotes que coincidan con los filtros aplicados.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Container>
        )}

        {location.pathname === "/map" && (
          <Container fluid className="py-4">
            <div className="map-container rounded">
              <img
                src="https://lafederalaclub.com/contenidos/uploads/2025/04/Plano-con-Vendidos.jpg"
                alt="Mapa del Club de Campo La Federala"
                className="img-fluid w-100 h-100"
                style={{ objectFit: "contain" }}
              />
              {/* Clickable Parcels */}
              {mockLots.slice(0, 4).map((lot, index) => (
                <div
                  key={lot.id}
                  className="parcel-overlay parcel-hover"
                  style={{
                    top: `${25 + index * 15}%`,
                    left: `${30 + index * 10}%`,
                  }}
                  onClick={() => handleParcelClick(lot.id)}
                >
                  <div className="parcel-label">{lot.id}</div>
                </div>
              ))}
            </div>
          </Container>
        )}

        {React.cloneElement(children, {
          filters,
          selectedLotId,
          onParcelClick: handleParcelClick,
          onSelectLot: setSelectedLotId,
        })}
      </main>

      <SidePanel
        show={showSidePanel}
        onHide={handleCloseSidePanel}
        selectedLotId={selectedLotId}
        onViewDetail={setSelectedLotId}
      />

      {/* Side Panel for Map */}
      <Offcanvas show={showSidePanel} onHide={() => setShowSidePanel(false)} placement="end" style={{ width: "400px" }}>
        <Offcanvas.Header closeButton className="brand-pale-green">
          <Offcanvas.Title className="text-brand-dark-green">Lote #{currentLot?.id}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {currentLot && (
            <>
              {/* Image Carousel */}
              <Carousel className="mb-4">
                {(currentLot.images || []).map((image, index) => (
                  <Carousel.Item key={index}>
                    <img
                      className="d-block w-100"
                      src={image || "/placeholder.svg"}
                      alt={`Imagen ${index + 1} de Lote ${currentLot.id}`}
                      style={{ height: "200px", objectFit: "cover" }}
                    />
                  </Carousel.Item>
                ))}
              </Carousel>

              {/* Data Fields */}
              <div className="mb-4">
                <Row className="g-3">
                  <Col xs={6}>
                    <Card className="brand-pale-green">
                      <Card.Body className="p-3">
                        <small className="text-muted text-uppercase">ID</small>
                        <div className="fw-bold text-brand-dark-green">{currentLot.id}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6}>
                    <Card className="brand-pale-green">
                      <Card.Body className="p-3">
                        <small className="text-muted text-uppercase">Estado</small>
                        <div className="fw-bold text-brand-dark-green">{currentLot.status}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={12}>
                    <Card className="brand-pale-green">
                      <Card.Body className="p-3">
                        <small className="text-muted text-uppercase">Propietario</small>
                        <div className="fw-bold text-brand-dark-green">{currentLot.owner}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6}>
                    <Card className="brand-pale-green">
                      <Card.Body className="p-3">
                        <small className="text-muted text-uppercase">Superficie</small>
                        <div className="fw-bold text-brand-dark-green">{currentLot.surface || "N/A"}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6}>
                    <Card className="brand-pale-green">
                      <Card.Body className="p-3">
                        <small className="text-muted text-uppercase">Precio</small>
                        <div className="fw-bold text-brand-dark-green">{currentLot.price || "N/A"}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <Row>
                  <Col xs={6}>
                    <Button
                      variant="outline-success"
                      className="w-100"
                      onClick={() => alert(`Reservar ${currentLot.id}`)}
                    >
                      Reservar
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button className="brand-dark-green w-100" onClick={() => alert(`Editar ${currentLot.id}`)}>
                      Editar
                    </Button>
                  </Col>
                </Row>
                <Row>
                  <Col xs={6}>
                    <Button
                      variant="outline-secondary"
                      className="w-100"
                      onClick={() => alert(`Ver cuenta ${currentLot.id}`)}
                    >
                      Ver cuenta
                    </Button>
                  </Col>
                  <Col xs={6}>
                    <Button
                      variant="link"
                      className="text-brand-dark-green w-100"
                      onClick={() => handleViewDetail(currentLot.id)}
                    >
                      Ver detalle completo
                    </Button>
                  </Col>
                </Row>
              </div>
            </>
          )}
        </Offcanvas.Body>
      </Offcanvas>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="xl" fullscreen="lg-down">
        <Modal.Header closeButton className="brand-pale-green">
          <Modal.Title className="text-brand-dark-green">LOTE nº {editingLot?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingLot && (
            <Container>
              <Row>
                <Col lg={4}>
                  <h5 className="text-brand-dark-green mb-3">Información del Lote</h5>
                  {[
                    { key: "id", label: "ID", value: editingLot.id, editable: false },
                    { key: "status", label: "Estado", value: editingLot.status, editable: true },
                    { key: "owner", label: "Propietario", value: editingLot.owner, editable: true },
                    { key: "surface", label: "Superficie", value: editingLot.surface || "N/A", editable: true },
                    { key: "price", label: "Precio", value: editingLot.price || "N/A", editable: true },
                    { key: "location", label: "Ubicación", value: editingLot.location || "N/A", editable: true },
                    { key: "plan", label: "Plano", value: editingLot.plan, editable: true },
                  ].map((field) => (
                    <Row key={field.key} className="mb-2">
                      <Col xs={4} className="bg-light p-2 border">
                        <small className="fw-bold text-muted">{field.label}:</small>
                      </Col>
                      <Col xs={8} className="p-2 border">
                        {isEditing && field.editable ? (
                          <FormControl
                            size="sm"
                            value={field.value}
                            onChange={(e) => setEditingLot((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          />
                        ) : (
                          <small>{field.value}</small>
                        )}
                      </Col>
                    </Row>
                  ))}
                </Col>
                <Col lg={8}>
                  <div className="mb-4">
                    <img
                      src={editingLot.images?.[0] || "/placeholder.svg?width=600&height=400&text=Imagen+Principal+Lote"}
                      alt={`Imagen principal de Lote ${editingLot.id}`}
                      className="img-fluid rounded"
                      style={{ height: "300px", width: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <h5 className="text-brand-dark-green mb-3">Descripción</h5>
                    <ul className="list-unstyled">
                      {editingLot.descriptionPoints?.map((point, index) => (
                        <li key={index} className="mb-1">
                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                          <small>{point}</small>
                        </li>
                      )) || (
                        <li>
                          <small>No hay descripción disponible.</small>
                        </li>
                      )}
                    </ul>
                  </div>
                </Col>
              </Row>
            </Container>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Cerrar
          </Button>
          <Button variant={isEditing ? "secondary" : "warning"} onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? "Cancelar edición" : "Editar lote"}
          </Button>
          {isEditing && (
            <Button className="brand-dark-green" onClick={handleSaveLot}>
              <i className="bi bi-save me-1"></i>
              Guardar cambios
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Account Modal */}
      <Modal show={showAccountModal} onHide={() => setShowAccountModal(false)} size="lg">
        <Modal.Header closeButton className="brand-pale-green">
          <Modal.Title className="text-brand-dark-green">Mi Cuenta</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs defaultActiveKey="profile" className="mb-3">
            <Tab
              eventKey="profile"
              title={
                <>
                  <i className="bi bi-person me-1"></i>Mi Perfil
                </>
              }
            >
              <Row>
                <Col md={4} className="text-center">
                  <img
                    src={mockUser.avatar || "/placeholder.svg"}
                    alt={mockUser.name}
                    className="rounded-circle mb-3"
                    width="100"
                    height="100"
                  />
                  <h5 className="text-brand-dark-green">{mockUser.name}</h5>
                  <Badge bg="secondary">{mockUser.role}</Badge>
                </Col>
                <Col md={8}>
                  <h6 className="text-brand-dark-green">Información de Contacto</h6>
                  <div className="mb-2">
                    <i className="bi bi-envelope me-2 text-brand-dark-green"></i>
                    {mockUser.email}
                  </div>
                  <div className="mb-2">
                    <i className="bi bi-telephone me-2 text-brand-dark-green"></i>
                    {mockUser.phone}
                  </div>
                  <div className="mb-3">
                    <i className="bi bi-calendar me-2 text-brand-dark-green"></i>
                    Miembro desde {mockUser.joinDate}
                  </div>

                  <h6 className="text-brand-dark-green">
                    <i className="bi bi-activity me-2"></i>
                    Actividad Reciente
                  </h6>
                  {mockUser.activityLog.map((activity) => (
                    <div key={activity.id} className="brand-pale-green p-3 rounded mb-2">
                      <div className="d-flex justify-content-between">
                        <div>
                          <div className="fw-bold text-brand-dark-green">{activity.action}</div>
                          <small className="text-muted">{activity.details}</small>
                        </div>
                        <small className="text-muted">{activity.date}</small>
                      </div>
                    </div>
                  ))}
                </Col>
              </Row>
            </Tab>
            <Tab
              eventKey="reservations"
              title={
                <>
                  <i className="bi bi-calendar me-1"></i>Mis Reservas
                </>
              }
            >
              <h6 className="text-brand-dark-green">Historial de Reservas</h6>
              {mockUser.reservations.map((reservation) => (
                <div key={reservation.id} className="brand-pale-green p-3 rounded mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-bold text-brand-dark-green">Lote {reservation.lotId}</div>
                      <small className="text-muted">Fecha: {reservation.date}</small>
                      <br />
                      <small className="text-muted">Monto: {reservation.amount}</small>
                    </div>
                    <Badge
                      bg={
                        reservation.status === "Activa"
                          ? "success"
                          : reservation.status === "Completada"
                            ? "primary"
                            : "danger"
                      }
                    >
                      {reservation.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </Tab>
            <Tab
              eventKey="settings"
              title={
                <>
                  <i className="bi bi-gear me-1"></i>Configuraciones
                </>
              }
            >
              <h6 className="text-brand-dark-green">Configuraciones</h6>
              <div className="brand-pale-green p-3 rounded mb-3">
                <h6 className="text-brand-dark-green">Notificaciones</h6>
                <small className="text-muted">Configurar preferencias de notificaciones por email y SMS</small>
              </div>
              <div className="brand-pale-green p-3 rounded mb-3">
                <h6 className="text-brand-dark-green">Privacidad</h6>
                <small className="text-muted">Gestionar configuraciones de privacidad y datos personales</small>
              </div>
              <div className="brand-pale-green p-3 rounded mb-3">
                <h6 className="text-brand-dark-green">Seguridad</h6>
                <small className="text-muted">Cambiar contraseña y configurar autenticación de dos factores</small>
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAccountModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <User show={showUserModal} onHide={() => setShowUserModal(false)} user={mockUser} />
    </div>
  )
}
