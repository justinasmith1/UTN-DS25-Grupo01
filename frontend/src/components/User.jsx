// src/components/User.jsx
// Muestra un modal con pestañas para perfil y actividad
import { Modal, Tabs, Tab, Row, Col, Card, Badge } from "react-bootstrap"

const customStyles = `
  .brand-pale-green { 
    background-color: #e6efe9 !important; 
  }
  .text-brand-dark-green { 
    color: #0b3d23 !important; 
  }
  .user-card {
    border-radius: 12px !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .activity-item {
    border-radius: 12px !important;
    transition: all 0.15s ease;
  }
  .activity-item:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`

export default function User({ show, onHide, user }) {
  if (!user) return null // No renderiza basicamente si no hay usuario

  return (
    <>
      <style>{customStyles}</style>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton className="brand-pale-green">
          <Modal.Title className="text-brand-dark-green fw-bold">Mi Cuenta</Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <Tabs defaultActiveKey="profile" className="mb-4">
            <Tab
              eventKey="profile"
              title={
                <span>
                  <i className="bi bi-person me-2"></i>Mi Perfil
                </span>
              }
            >
              <Row className="g-4">
                <Col md={4} className="text-center">
                  <Card className="user-card">
                    <Card.Body className="p-4">
                      <img
                        src={user.avatar || "/placeholder.svg"}
                        alt={user.name}
                        className="rounded-circle mb-3"
                        width="100"
                        height="100"
                        style={{ objectFit: "cover" }}
                      />
                      <h5 className="text-brand-dark-green fw-bold mb-2">{user.name}</h5>
                      <Badge bg="secondary" className="px-3 py-2">
                        {user.role}
                      </Badge>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={8}>
                  <Card className="user-card">
                    <Card.Header className="brand-pale-green">
                      <h6 className="text-brand-dark-green mb-0 fw-bold">Información de Contacto</h6>
                    </Card.Header>
                    <Card.Body className="p-4">
                      <div className="mb-3 d-flex align-items-center">
                        <i className="bi bi-envelope me-3 text-brand-dark-green" style={{ fontSize: "1.1rem" }}></i>
                        <span>{user.email}</span>
                      </div>
                      <div className="mb-3 d-flex align-items-center">
                        <i className="bi bi-telephone me-3 text-brand-dark-green" style={{ fontSize: "1.1rem" }}></i>
                        <span>{user.phone}</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-calendar me-3 text-brand-dark-green" style={{ fontSize: "1.1rem" }}></i>
                        <span>Miembro desde {user.joinDate}</span>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card className="user-card mt-4">
                <Card.Header className="brand-pale-green">
                  <h6 className="text-brand-dark-green mb-0 fw-bold">
                    <i className="bi bi-activity me-2"></i>
                    Actividad Reciente
                  </h6>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="d-flex flex-column gap-3">
                    {user.activityLog?.map((activity) => (
                      <div key={activity.id} className="activity-item brand-pale-green p-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="fw-bold text-brand-dark-green mb-1">{activity.action}</div>
                            <small className="text-muted">{activity.details}</small>
                          </div>
                          <small className="text-muted">{activity.date}</small>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-muted py-3">
                        <i className="bi bi-info-circle me-2"></i>
                        No hay actividad reciente
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Tab>

            <Tab
              eventKey="reservations"
              title={
                <span>
                  <i className="bi bi-calendar me-2"></i>Mis Reservas
                </span>
              }
            >
              <Card className="user-card">
                <Card.Header className="brand-pale-green">
                  <h6 className="text-brand-dark-green mb-0 fw-bold">Historial de Reservas</h6>
                </Card.Header>
                <Card.Body className="p-4">
                  <div className="d-flex flex-column gap-3">
                    {user.reservations?.map((reservation) => (
                      <div key={reservation.id} className="activity-item brand-pale-green p-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="fw-bold text-brand-dark-green mb-1">Lote {reservation.lotId}</div>
                            <small className="text-muted d-block">Fecha: {reservation.date}</small>
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
                            className="px-3 py-2"
                          >
                            {reservation.status}
                          </Badge>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center text-muted py-3">
                        <i className="bi bi-info-circle me-2"></i>
                        No hay reservas registradas
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Tab>

            <Tab
              eventKey="settings"
              title={
                <span>
                  <i className="bi bi-gear me-2"></i>Configuraciones
                </span>
              }
            >
              <div className="d-flex flex-column gap-3">
                <Card className="user-card">
                  <Card.Body className="p-4">
                    <h6 className="text-brand-dark-green fw-bold mb-2">Notificaciones</h6>
                    <small className="text-muted">Configurar preferencias de notificaciones por email y SMS</small>
                  </Card.Body>
                </Card>

                <Card className="user-card">
                  <Card.Body className="p-4">
                    <h6 className="text-brand-dark-green fw-bold mb-2">Privacidad</h6>
                    <small className="text-muted">Gestionar configuraciones de privacidad y datos personales</small>
                  </Card.Body>
                </Card>

                <Card className="user-card">
                  <Card.Body className="p-4">
                    <h6 className="text-brand-dark-green fw-bold mb-2">Seguridad</h6>
                    <small className="text-muted">Cambiar contraseña y configurar autenticación de dos factores</small>
                  </Card.Body>
                </Card>
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>
      </Modal>
    </>
  )
}
