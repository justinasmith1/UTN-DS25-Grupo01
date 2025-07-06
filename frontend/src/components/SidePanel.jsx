import { useState } from "react"
import { Offcanvas, Button, Card, Row, Col, Carousel } from "react-bootstrap"
/*Falta invocar LotInfo para poder ver el detalle completo desde el SidePanel */

const customStyles = `
  .brand-pale-green { 
    background-color: #e6efe9 !important; 
  }
  .brand-dark-green { 
    background-color: #0b3d23 !important; 
    border-color: #0b3d23 !important; 
    color: white !important;
  }
  .brand-dark-green:hover { 
    background-color: rgba(11, 61, 35, 0.8) !important; 
  }
  .text-brand-dark-green { 
    color: #0b3d23 !important; 
  }
  .border-brand-dark-green { 
    border-color: #0b3d23 !important; 
  }
  .side-panel-card {
    border-radius: 12px !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.15s ease;
  }
  .action-btn {
    border-radius: 12px !important;
    transition: all 0.15s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .action-btn:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }
`

export default function SidePanel({ show, onHide, selectedLotId, onViewDetail, lots, abrirModalEditar }) {
  // Indice de imagen actual en el carrusel
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  // Busca el lote seleccionado en los datos
  const currentLot = lots.find((lot) => lot.id === selectedLotId)
  if (!currentLot) return null

  const images = currentLot.images || []

  // Acciones de ejemplo: editar, reservar, ver cuenta
  const handleReserve = () => {
    alert(`Reservar lote ${currentLot.id}`)
  }
  const handleViewAccount = () => {
    alert(`Ver cuenta para lote ${currentLot.id}`)
  }
  const handleViewDetail = () => {
    onViewDetail(currentLot.id)
    onHide()
  }

  return (
    <>
      <style>{customStyles}</style>
      <Offcanvas
        show={show}
        onHide={onHide}
        placement="end"
        style={{ width: "400px", borderRadius: "12px 0 0 12px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.15)" }}
      >
        <Offcanvas.Header closeButton className="brand-pale-green">
          <Offcanvas.Title className="text-brand-dark-green fw-bold">Lote #{currentLot.id}</Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body className="p-4">
          {/* Image Carousel */}
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
              <div className="side-panel-card overflow-hidden">
                <img
                  src={images[0] || "/placeholder.svg?width=400&height=200&text=Imagen+Lote"}
                  alt={`Imagen de Lote ${currentLot.id}`}
                  className="img-fluid w-100"
                  style={{ height: "200px", objectFit: "cover" }}
                />
              </div>
            )}
          </div>

          {/* Data Fields */}
          <div className="mb-4">
            <Row className="g-3">
              <Col xs={6}>
                <Card className="brand-pale-green side-panel-card">
                  <Card.Body className="p-3">
                    <small className="text-muted text-uppercase fw-bold">ID</small>
                    <div className="fw-bold text-brand-dark-green">{currentLot.id}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={6}>
                <Card className="brand-pale-green side-panel-card">
                  <Card.Body className="p-3">
                    <small className="text-muted text-uppercase fw-bold">Estado</small>
                    <div className="fw-bold text-brand-dark-green">{currentLot.status}</div>
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
                    <small className="text-muted text-uppercase fw-bold">Precio</small>
                    <div className="fw-bold text-brand-dark-green">{currentLot.price || "N/A"}</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={12}>
                <Card className="brand-pale-green side-panel-card">
                  <Card.Body className="p-3">
                    <small className="text-muted text-uppercase fw-bold">Ubicación</small>
                    <div className="fw-bold text-brand-dark-green">{currentLot.location || "N/A"}</div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </div>
        </Offcanvas.Body>

        <div className="p-4 border-top brand-pale-green">
          <div className="d-grid gap-2">
            <Row>
              <Col xs={6}>
                <Button
                  variant="outline-success"
                  className="w-100 action-btn border-brand-dark-green text-brand-dark-green"
                  onClick={handleReserve}
                >
                  Reservar
                </Button>
              </Col>
              <Col xs={6}>
                <Button className="brand-dark-green w-100 action-btn" onClick={() => abrirModalEditar(currentLot)}>
                  Editar
                </Button>
              </Col>
            </Row>
            <Row>
              <Col xs={6}>
                <Button variant="outline-secondary" className="w-100 action-btn" onClick={handleViewAccount}>
                  Ver cuenta
                </Button>
              </Col>
              <Col xs={6}>
                <Button variant="link" className="text-brand-dark-green w-100" onClick={handleViewDetail}>
                  Ver detalle completo
                </Button>
              </Col>
            </Row>
          </div>
        </div>
      </Offcanvas>
    </>
  )
}
