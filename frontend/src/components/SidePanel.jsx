// Este es el panel lateral que se abre al hacer click en un lote en el mapa
// - Reservar:      LOT_RESERVE  (Admin, Inmobiliaria)
// - Editar:        LOT_EDIT     (Admin, Técnico, Gestor)
// - Ver detalle:   LOT_DETAIL   (todos los roles)
import { useState } from "react"
import { Offcanvas, Button, Card, Row, Col, Carousel } from "react-bootstrap"
import { useAuth } from "../app/providers/AuthProvider";         // usa la misma ruta que en otros componentes
import { can } from "../lib/auth/rbac";                          // idem
import { PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import { createReserva } from "../lib/api/reservas";

const customStyles = `
  .brand-pale-green { background-color: #e6efe9 !important; }
  .brand-dark-green { background-color: #0b3d23 !important; border-color: #0b3d23 !important; color: white !important; }
  .brand-dark-green:hover { background-color: rgba(11,61,35,.8) !important; border-color: rgba(11,61,35,.8) !important; }
  .text-brand-dark-green { color: #0b3d23 !important; }
  .border-brand-dark-green { border-color: #0b3d23 !important; }
  .side-panel-card { border-radius: 12px !important; overflow: hidden; }
  .action-btn { border-radius: 10px !important; }
  .no-wrap { white-space: nowrap; }
`;

export default function SidePanel({
  show,
  onHide,
  selectedLotId,
  onViewDetail,
  lots,
  abrirModalEditar,
}) {
  // ÍNDICES Y DATOS
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const currentLot = lots.find((lot) => lot.id === selectedLotId);
  if (!currentLot) return null;

  const images = currentLot.images || [];

  // PERMISOS DEL USUARIO (lo calculo una sola vez por render)
  const { user } = useAuth();
  const canReserve = can(user, PERMISSIONS.LOT_RESERVE);
  const canEdit    = can(user, PERMISSIONS.LOT_EDIT);
  const canDetail  = can(user, PERMISSIONS.LOT_DETAIL);


  const { success, error } = useToast() ?? { success: () => {}, error: () => {} };

  // ACCIONES
  const handleReserve = async () => {
    try {
      // Armo un payload mínimo. Si después el back pide más campos,
      // los agregamos acá (esto queda como “adaptador” de la UI).
      const payload = {
        lotId: currentLot.id,
        // monto opcional: uso el price del lote si existe
        amount: currentLot.price || null,
        // la inmobiliaria responsable (si el rol es INMOBILIARIA lo tenemos)
        inmobiliariaId: user?.inmobiliariaId ?? null,
        // status inicial “Activa” y fecha la pone el adapter (mock) o el back
      };

      await createReserva(payload);

      // Aviso y cierro el panel (UX simple)
      success("Reserva creada");
      onHide();
    } catch (err) {
      console.error(err);
      error("No pude crear la reserva");
    }
  };


  const handleViewDetail = () => {
    onViewDetail(currentLot.id);
    onHide();
  };

  return (
    <>
      <style>{customStyles}</style>

      <Offcanvas
        show={show}
        onHide={onHide}
        placement="end"
        style={{ width: "400px", borderRadius: "12px 0 0 12px", boxShadow: "0 4px 6px rgba(0,0,0,.15)" }}
      >
        <Offcanvas.Header closeButton className="brand-pale-green">
          <Offcanvas.Title className="text-brand-dark-green fw-bold">
            Lote #{currentLot.id}
          </Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="p-4">
          {/* Carrusel de imágenes (si hay varias) */}
          <div className="mb-4">
            {images.length > 1 ? (
              <Carousel
                activeIndex={currentImageIndex}
                onSelect={setCurrentImageIndex}
                className="side-panel-card overflow-hidden"
              >
                {images.map((image, index) => (
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
            ) : (
              <Card className="side-panel-card brand-pale-green">
                <Card.Body className="p-0">
                  <img
                    className="d-block w-100"
                    src={images[0] || "/placeholder.svg"}
                    alt={`Lote ${currentLot.id}`}
                    style={{ height: "200px", objectFit: "cover" }}
                  />
                </Card.Body>
              </Card>
            )}
          </div>

          {/* Datos principales del lote */}
          <div className="mb-4">
            <Row className="g-3">
              <Col xs={6}>
                <Card className="brand-pale-green side-panel-card">
                  <Card.Body className="p-3">
                    <small className="text-muted text-uppercase fw-bold">Estado</small>
                    <div className="fw-bold text-brand-dark-green">{currentLot.status}</div>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={6}>
                <Card className="brand-pale-green side-panel-card">
                  <Card.Body className="p-3">
                    <small className="text-muted text-uppercase fw-bold">Estado-Plano</small>
                    <div className="fw-bold text-brand-dark-green">{currentLot.subStatus}</div>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={12}>
                <Card className="brand-pale-green side-panel-card">
                  <Card.Body className="p-3">
                    <small className="text-muted text-uppercase fw-bold">Propietario</small>
                    <div className="fw-bold text-brand-dark-green">{currentLot.owner}</div>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={6}>
                <Card className="brand-pale-green side-panel-card">
                  <Card.Body className="p-3">
                    <small className="text-muted text-uppercase fw-bold">Superficie</small>
                    <div className="fw-bold text-brand-dark-green">{currentLot.surface || "N/A"}</div>
                  </Card.Body>
                </Card>
              </Col>

              <Col xs={6}>
                <Card className="brand-pale-green side-panel-card">
                  <Card.Body className="p-3">
                    <small className="text-muted text-uppercase fw-bold">Ubicación</small>
                    <div className="fw-bold text-brand-dark-green">{currentLot.location}</div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>

          {/* Acciones del lote (visibles según permisos) */}
          <div className="mb-2">
            <Row className="g-2">
              {/* Reservar (Admin, Inmobiliaria) */}
              {canReserve && (
                <Col xs={6}>
                  <Button
                    variant="outline-success"
                    className="w-100 action-btn border-brand-dark-green text-brand-dark-green"
                    onClick={handleReserve}
                  >
                    Reservar
                  </Button>
                </Col>
              )}

              {/* Editar (Admin, Técnico, Gestor) */}
              {canEdit && (
                <Col xs={6}>
                  <Button
                    className="brand-dark-green w-100 action-btn"
                    onClick={() => abrirModalEditar(currentLot)}
                  >
                    Editar
                  </Button>
                </Col>
              )}
            </Row>

            <Row>
              {/* Ver detalle completo (todos los roles) */}
              {canDetail && (
                <Col xs={6}>
                  <Button
                    variant="link"
                    className="text-brand-dark-green w-100 no-wrap"
                    onClick={handleViewDetail}
                  >
                    Ver detalle completo
                  </Button>
                </Col>
              )}
            </Row>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
