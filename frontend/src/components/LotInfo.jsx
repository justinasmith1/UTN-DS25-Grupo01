// src/components/LotInfo.jsx
import React, { useState } from "react"
import { Modal, Container, Row, Col, Card, Button, FormControl, Carousel } from "react-bootstrap"
import { useOutletContext } from "react-router-dom"

const customStyles = `
  .brand-pale-green { background-color: #e6efe9 !important; }
  .brand-dark-green { background-color: #0b3d23 !important; border-color: #0b3d23 !important; color: white !important;}
  .brand-dark-green:hover { background-color: rgba(11, 61, 35, 0.8) !important; }
  .text-brand-dark-green { color: #0b3d23 !important; }
  .border-brand-dark-green { border-color: #0b3d23 !important;}
  .brand-gray { background-color: #f0f0f0 !important; }
  .detail-card { border-radius: 12px !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);}
  .action-btn { border-radius: 12px !important; transition: all 0.15s ease; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
  .action-btn:hover { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15); transform: translateY(-1px); }
  .data-field { border-radius: 0; border: 1px solid #dee2e6;}
  .data-field-label { background-color: #f0f0f0; border-right: 1px solid #dee2e6;}
  .sticky-action-bar {position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #dee2e6; padding: 1rem; box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1); z-index: 1040;} 
`

export default function LotInfo({ show, onHide, selectedLotId, lots, abrirModalEditar }) {
  // leemos lots y la función para editar
  const lot = lots.find(l => l.id === selectedLotId)
  if (!lot) return null

  const images = lot.images || []

  return (
    <>
      <style>{customStyles}</style>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton className="brand-pale-green">
          <Modal.Title className="text-brand-dark-green fw-bold">
            LOTE nº {lot.mapId ?? lot.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="text-brand-dark-green mb-0">Información del Lote</h5>
              <Button variant="warning" onClick={() => abrirModalEditar(lot)}>
                Editar lote
              </Button>
            </div>
            <Row>
              <Col lg={6}>
                <table className="table detail-card">
                  <tbody>
                    <tr><th>ID</th><td>{lot.mapId ?? lot.id}</td></tr>
                    <tr><th>Estado</th><td>{lot.status}</td></tr>
                    <tr><th>Sub-Estado</th><td>{lot.subStatus}</td></tr>
                    <tr><th>Propietario</th><td>{lot.owner}</td></tr>
                    {lot.surface && <tr><th>Superficie</th><td>{lot.surface}</td></tr>}
                    {lot.price   && <tr><th>Precio</th><td>{lot.price}</td></tr>}
                    {lot.location&& <tr><th>Ubicación</th><td>{lot.location}</td></tr>}
                  </tbody>
                </table>
              </Col>
              <Col lg={6}>
              <div className="mb-4">
                {images.length > 1 ? (
                  <Carousel className="detail-card overflow-hidden">
                    {images.map((img, i) => (
                      <Carousel.Item key={i}>
                        <img
                          className="d-block w-100 detail-card"
                          src={img}
                          alt={`Lote ${lot.mapId ?? lot.id} imagen ${i + 1}`}
                          style={{ height: "300px", objectFit: "cover" }}
                        />
                      </Carousel.Item>
                    ))}
                  </Carousel>
                ) : images[0] ? (
                  // Si sólo hay una imagen
                  <img
                    src={images[0]}
                    alt={`Lote ${lot.mapId ?? lot.id}`}
                    className="img-fluid detail-card mb-4"
                    style={{ width: "100%", height: "300px", objectFit: "cover" }}
                  />
                ) : null}
              </div>
                </Col>
                <div className="mb-4">
                  {lot.descriptionPoints && lot.descriptionPoints.length > 0 && (
                    <Card className="p-3 detail-card">
                      <Card.Title className="mb-3">Descripción</Card.Title>
                      <ul className="mb-0">
                        {lot.descriptionPoints.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>
            </Row>
          </Container>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
