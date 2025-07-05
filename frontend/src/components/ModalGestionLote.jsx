// src/components/ModalGestionLote.jsx
"use client"

import { useState, useEffect } from "react"
import { Modal, Button, Form } from "react-bootstrap"

/**
  Modal que unifica creacion, edicion y eliminacion de un lote.
  Props:
  - show: boolean que controla visibilidad
  - modo: "crear" | "editar"
  - datosIniciales: objeto con los campos del lote (solo en edicion)
  - onHide: funcion para cerrar el modal
  - onSave: funcion(lote) para guardar o crear
  - onDelete: funcion(id) para eliminar (sólo en modo "editar")
 */
export default function ModalGestionLote({
  show,
  modo, // para crear, editar o borrar
  datosIniciales, // para editar o borrar
  onHide,
  onSave,
  onDelete
}) {
  const esEdicion = modo === "editar"
  const esBorrado = modo === "borrar"

  if (esBorrado) {
    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar Lote</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Estás seguro de que deseas eliminar el lote{" "}
          <strong>{datosIniciales.id}</strong>? Esta acción es irreversible.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onDelete(datosIniciales.id)
              onHide()
            }}
          >
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>
    )
  }

  // Estado local de los campos del formulario
  const [formData, setFormData] = useState({
    id: "",
    status: "Disponible",
    subStatus: "En Venta",
    owner: "",
    location: ""
  })

  // controla la visibilidad del confirm interno
  const [showConfirm, setShowConfirm] = useState(false)

  // Cuando cambiamos de modo o lote, inicializamos el formulario
  useEffect(() => {
    setShowConfirm(false)
    if (esEdicion && datosIniciales) {
      setFormData({ ...datosIniciales })
    } else {
      // reinicia en modo creacion
      setFormData({
        id: "",
        status: "Disponible", //Estos proque es medio raro que lo creemos y no este disponible, igual todo esto con BD
        subStatus: "En Venta",
        owner: "",
        location: ""
      })
    }
  }, [show, esEdicion, datosIniciales])

  // Actualiza cada campo al tipear
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = () => {
    onSave(formData)
    onHide()
  }


  // cuando hacen click en “Eliminar” abrimos el confirm
  const handleDeleteClick = () => {
    setShowConfirm(true)
  }

  // al confirmar, llamamos al callback real y cerramos todo
  const handleConfirmDelete = () => {
    onDelete(formData.id)
    setShowConfirm(false)
    onHide()
  }

  return (
    <>
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {esEdicion ? "Editar Lote" : "Nuevo Lote"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>ID del lote</Form.Label>
            {/* En edicion no permitimos cambiar el ID */}
            <Form.Control
              name="id"
              value={formData.id}
              onChange={handleChange}
              disabled={esEdicion}
              placeholder="Ej. L006"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Estado</Form.Label>
            <Form.Select
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option>Disponible</option>
              <option>Vendido</option>
              <option>No Disponible</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Sub-Estado</Form.Label>
            <Form.Select
              name="subStatus"
              value={formData.subStatus}
              onChange={handleChange}
            >
              <option>En Venta</option>
              <option>Reservado</option>
              <option>Alquilado</option>
              <option>En Construccion</option>
              <option>Construido</option>
              <option>No Construido</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Propietario</Form.Label>
            <Form.Control
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ubicación</Form.Label>
            <Form.Control
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Ej. Sector Norte"
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        {/* En edicion mostramos botón de eliminacion */}
        {esEdicion && (
          <Button variant="outline-danger" onClick={handleDeleteClick}>
            Eliminar
          </Button>
        )}
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSave}>
          {esEdicion ? "Guardar cambios" : "Crear lote"}
        </Button>
      </Modal.Footer>
    </Modal>
    {/* Confirmación interna */}
      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Eliminar Lote</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            ¿Estás seguro de que deseas eliminar el lote&nbsp;
            <strong>{formData.id}</strong>? Esta acción es irreversible.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>
      </>
  )
}
