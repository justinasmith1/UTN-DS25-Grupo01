"use client"

import React, { useState } from "react"
import { Modal, Container, Row, Col, Card, Button, FormControl } from "react-bootstrap"
import { mockLots } from "../lib/data"

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
  .brand-gray { 
    background-color: #f0f0f0 !important; 
  }
  .detail-card {
    border-radius: 12px !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
  .data-field {
    border-radius: 0;
    border: 1px solid #dee2e6;
  }
  .data-field-label {
    background-color: #f0f0f0;
    border-right: 1px solid #dee2e6;
  }
  .sticky-action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-top: 1px solid #dee2e6;
    padding: 1rem;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1040;
  }
`

export default function LotInfo({ show, onHide, selectedLotId }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedLot, setEditedLot] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)

  const currentLot = mockLots.find((lot) => lot.id === selectedLotId)

  React.useEffect(() => {
    if (currentLot) {
      setEditedLot({ ...currentLot })
      setHasChanges(false)
    }
  }, [currentLot])

  if (!currentLot || !editedLot) return null

  const handleFieldChange = (field, value) => {
    setEditedLot((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    alert("Lote guardado exitosamente")
    setHasChanges(false)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedLot({ ...currentLot })
    setHasChanges(false)
    setIsEditing(false)
  }

  const dataFields = [
    { key: "id", label: "ID", value: editedLot.id, editable: false },
    { key: "status", label: "Estado", value: editedLot.status, editable: true },
    { key: "subStatus", label: "SubEstado", value: editedLot.subStatus, editable: true },
    { key: "owner", label: "Propietario", value: editedLot.owner, editable: true },
    { key: "surface", label: "Superficie", value: editedLot.surface || "N/A", editable: true },
    { key: "price", label: "Precio", value: editedLot.price || "N/A", editable: true },
    { key: "location", label: "Ubicación", value: editedLot.location || "N/A", editable: true },
    { key: "plan", label: "Plano", value: editedLot.plan, editable: true },
  ]

  return (
    <>
      <style>{customStyles}</style>
      <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down">
        <Modal.Header closeButton className="brand-pale-green">
          <Modal.Title className="text-brand-dark-green fw-bold">LOTE nº {editedLot.id}</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ paddingBottom: hasChanges || isEditing ? "80px" : "1rem" }}>
          <Container>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="text-brand-dark-green mb-0">Información del Lote</h3>
              <Button
                variant={isEditing ? "secondary" : "warning"}
                className="action-btn"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancelar edición" : "Editar lote"}
              </Button>
            </div>

            <Row className="g-4">
              {/* Data Fields */}
              <Col lg={5}>
                <div className="border detail-card overflow-hidden">
                  {dataFields.map((field, index) => (
                    <div key={field.key} className={`d-flex ${index < dataFields.length - 1 ? "border-bottom" : ""}`}>
                      <div className="data-field-label p-3 fw-bold text-muted" style={{ width: "40%" }}>
                        {field.label}:
                      </div>
                      <div className="p-3" style={{ width: "60%" }}>
                        {isEditing && field.editable ? (
                          <FormControl
                            size="sm"
                            value={field.value}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            style={{ border: "none", padding: "0", background: "transparent" }}
                          />
                        ) : (
                          <span className="fw-semibold">{field.value}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Col>

              {/* Image and Description */}
              <Col lg={7}>
                <Card className="detail-card">
                  <Card.Body className="p-4">
                    <div className="mb-4">
                      <img
                        src={
                          editedLot.images?.[0] ||
                          "/placeholder.svg?width=600&height=400&text=Imagen+Principal+Lote" ||
                          "/placeholder.svg"
                        }
                        alt={`Imagen principal de Lote ${editedLot.id}`}
                        className="img-fluid rounded detail-card"
                        style={{ height: "300px", width: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div>
                      <h5 className="text-brand-dark-green mb-3 fw-bold">Descripción</h5>
                      <ul className="list-unstyled">
                        {editedLot.descriptionPoints?.map((point, index) => (
                          <li key={index} className="mb-2 d-flex align-items-start">
                            <i className="bi bi-check-circle-fill text-success me-2 mt-1"></i>
                            <span>{point}</span>
                          </li>
                        )) || (
                          <li className="text-muted">
                            <i className="bi bi-info-circle me-2"></i>
                            No hay descripción disponible.
                          </li>
                        )}
                      </ul>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} className="action-btn">
            Cerrar
          </Button>
        </Modal.Footer>

        {/* Sticky Action Bar */}
        {(isEditing || hasChanges) && (
          <div className="sticky-action-bar">
            <Container>
              <div className="d-flex justify-content-end gap-3">
                <Button variant="outline-secondary" onClick={handleCancel} className="action-btn">
                  Cancelar
                </Button>
                <Button
                  className="brand-dark-green action-btn"
                  onClick={handleSave}
                  disabled={!hasChanges}
                  style={{ opacity: hasChanges ? 1 : 0.6 }}
                >
                  <i className="bi bi-save me-2"></i>
                  Guardar cambios
                </Button>
              </div>
            </Container>
          </div>
        )}
      </Modal>
    </>
  )
}
