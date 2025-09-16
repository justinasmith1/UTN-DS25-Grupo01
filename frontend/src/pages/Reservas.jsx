// src/pages/Reservas.jsx
// Lista + CRUD de Reservas con mapeo de errores del backend (Zod) a campos del modal.
// Mantiene permisos, filtros por rol y querystring como tenías.
// Comentarios cortos para guiar el mantenimiento.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner, Badge } from "react-bootstrap";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import { useSearchParams } from "react-router-dom";
import { parseApiError, mapApiValidationToFields } from "../lib/http/errors"; // <- helper nuevo

import {
  getAllReservas,
  createReserva,
  updateReserva,
  deleteReserva,
} from "../lib/api/reservas";

// badge por estado
const statusVariant = (s) =>
  s === "Activa" ? "success" : s === "Cancelada" ? "danger" : "secondary";

export default function Reservas() {
  // estado base
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [searchParams] = useSearchParams();
  const lotIdParam = searchParams.get("lotId");

  // modal y errores de formulario
  const [modal, setModal] = useState({ show: false, modo: "crear", datos: null });
  const [modalErrors, setModalErrors] = useState({}); // errores por campo
  const [formError, setFormError] = useState("");     // mensaje general

  // toasts
  const toast = useToast();
  const success = toast?.success ?? (() => {});
  const error = toast?.error ?? (() => {});

  // permisos por rol
  const { user } = useAuth();
  const p = useMemo(
    () => ({
      view:   can(user, PERMISSIONS.RES_VIEW),
      create: can(user, PERMISSIONS.RES_CREATE),
      edit:   can(user, PERMISSIONS.RES_EDIT),
      del:    can(user, PERMISSIONS.RES_DELETE),
    }),
    [user]
  );

  // carga inicial (filtro por inmobiliaria si corresponde y por lotId si viene en la URL)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const params = {};
        if (user?.role === "INMOBILIARIA" && user?.inmobiliariaId) params.inmobiliariaId = user.inmobiliariaId;
        if (lotIdParam) params.lotId = lotIdParam;
        const res = await getAllReservas(params);
        if (alive) setItems(res.data || []);
      } catch (e) {
        console.error(e);
        error(parseApiError(e, "No pude cargar las reservas"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user, lotIdParam]);

  // abrir modales
  const abrirCrear = () => {
    setFormError(""); setModalErrors({});
    setModal({
    show: true,
    modo: "crear",
    datos: {
      lotId: lotIdParam || "",
      clienteId: "",          // requerido por back
      seniaMonto: "",         // se mapea a "sena" en el adapter
      date: "",               // se mapea a "fechaReserva"
      observaciones: "",
      status: "Activa",
      inmobiliariaId: user?.role === "INMOBILIARIA" ? user.inmobiliariaId : "",
  },
});

  };
  const abrirEditar = (r) => { setFormError(""); setModalErrors({}); setModal({ show: true, modo: "editar", datos: { ...r } }); };
  const cerrarModal = () => setModal((m) => ({ ...m, show: false }));

  // helpers de change para limpiar error de ese campo al tipear
  const onChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setModal((m) => ({ ...m, datos: { ...m.datos, [field]: value } }));
    if (modalErrors[field]) setModalErrors((x) => ({ ...x, [field]: null }));
  };

  // guardar (crear/editar) con mapeo de errores del back -> campos
  const guardar = async () => {
    try {
      setFormError(""); setModalErrors({});
      const payload = {
        lotId: String(modal.datos.lotId).trim(),
        clienteId: modal.datos.clienteId ? Number(modal.datos.clienteId) : null,
        seniaMonto: modal.datos.seniaMonto === "" ? null : Number(modal.datos.seniaMonto),
        date: modal.datos.date || null,                 // -> fechaReserva (toApi)
        observaciones: modal.datos.observaciones || "",
        status: modal.datos.status || "Activa",         // -> estado (toApi)
        inmobiliariaId: user?.role === "INMOBILIARIA" 
          ? user.inmobiliariaId 
          : (modal.datos.inmobiliariaId ?? null),
      };

      if (modal.modo === "crear") {
        const res = await createReserva(payload);
        setItems((prev) => [res.data, ...prev]);
        success("Reserva creada");
      } else {
        const res = await updateReserva(modal.datos.id, payload);
        setItems((prev) => prev.map((it) => (it.id === modal.datos.id ? res.data : it)));
        success("Reserva actualizada");
      }
      cerrarModal();
    } catch (e) {
      // 1) Toast de error legible
      error(parseApiError(e, "No pude guardar la reserva"));
      // 2) Pinto errores de validación campo por campo
      const { formError, fieldErrors } = mapApiValidationToFields(e);
      if (formError) setFormError(formError);
      if (fieldErrors && Object.keys(fieldErrors).length) setModalErrors(fieldErrors);
    }
  };

  // eliminar
  const eliminar = async (r) => {
    if (!window.confirm(`Eliminar la reserva ${r.id}?`)) return;
    try {
      await deleteReserva(r.id);
      setItems((prev) => prev.filter((it) => it.id !== r.id));
      success("Reserva eliminada");
    } catch (e) {
      error(parseApiError(e, "No pude eliminar la reserva"));
    }
  };

  // loading
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <Spinner animation="border" role="status" />
        <span className="ms-2">Cargando reservas…</span>
      </div>
    );
  }

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0">Reservas</h5>

        {lotIdParam && (
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">Lote:</span>
            <span className="badge bg-info text-dark">{lotIdParam}</span>
          </div>
        )}

        {p.create && <Button variant="success" onClick={abrirCrear}>Registrar reserva</Button>}
      </div>

      <Table hover responsive className="align-middle">
        <thead>
          <tr>
            <th>ID</th><th>Lote</th><th>Fecha</th><th>Estado</th><th>Monto</th><th>Inmobiliaria</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).length === 0 ? (
            <tr><td colSpan={7} className="text-center text-muted py-4">No hay reservas para mostrar</td></tr>
          ) : (
            items.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.lotId}</td>
                <td>{r.date || "-"}</td>
                <td><Badge bg={statusVariant(r.status)}>{r.status || "-"}</Badge></td>
                <td>{r.amount != null ? `$ ${r.amount}` : "-"}</td>
                <td>{r.inmobiliariaId ?? "-"}</td>
                <td className="d-flex gap-2">
                  {p.view && <Button size="sm" variant="outline-primary" onClick={() => abrirEditar(r)}>Ver</Button>}
                  {p.edit && <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(r)}>Editar</Button>}
                  {p.del  && <Button size="sm" variant="outline-danger"  onClick={() => eliminar(r)}>Eliminar</Button>}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Modal Crear/Editar con errores por campo */}
      <Modal show={modal.show} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modal.modo === "crear" ? "Registrar reserva" : `Editar reserva ${modal.datos?.id}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && <div className="alert alert-danger py-2">{formError}</div>}

          <Form.Group className="mb-3">
            <Form.Label>ID de Lote</Form.Label>
            <Form.Control
              type="text"
              value={modal.datos?.lotId ?? ""}
              isInvalid={!!modalErrors?.lotId}
              onChange={onChange("lotId")}
              placeholder="Ej: L003"
            />
            <Form.Control.Feedback type="invalid">{modalErrors?.lotId}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Monto (opcional)</Form.Label>
            <Form.Control
              type="number"
              value={modal.datos?.amount ?? ""}
              isInvalid={!!modalErrors?.amount}
              onChange={onChange("amount")}
              placeholder="Ej: 150000"
            />
            <Form.Control.Feedback type="invalid">{modalErrors?.amount}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea" rows={3}
              value={modal.datos?.observaciones ?? ""}
              isInvalid={!!modalErrors?.observaciones}
              onChange={onChange("observaciones")}
              placeholder="Notas internas"
            />
            <Form.Control.Feedback type="invalid">{modalErrors?.observaciones}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Estado</Form.Label>
            <Form.Select
              value={modal.datos?.status ?? "Activa"}
              isInvalid={!!modalErrors?.status}
              onChange={onChange("status")}
            >
              <option>Activa</option>
              <option>Cancelada</option>
              <option>Finalizada</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">{modalErrors?.status}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Fecha de reserva *</Form.Label>
            <Form.Control
              type="date"
              value={modal.datos?.date ?? ""}
              onChange={onChange("date")}
              placeholder="YYYY-MM-DD"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Cliente (ID) *</Form.Label>
            <Form.Control
              type="number"
              value={modal.datos?.clienteId ?? ""}
              onChange={onChange("clienteId")}
              placeholder="ID del cliente"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Seña (monto)</Form.Label>
            <Form.Control
              type="number"
              value={modal.datos?.seniaMonto ?? ""}
              onChange={onChange("seniaMonto")}
              placeholder="Ej: 50000"
            />
          </Form.Group>


          {/* Si el usuario NO es INMOBILIARIA, muestro el campo explícito */}
          {user?.role !== "INMOBILIARIA" && (
            <Form.Group className="mb-0">
              <Form.Label>Inmobiliaria (opcional)</Form.Label>
              <Form.Control
                type="text"
                value={modal.datos?.inmobiliariaId ?? ""}
                isInvalid={!!modalErrors?.inmobiliariaId}
                onChange={onChange("inmobiliariaId")}
                placeholder="ID de Inmobiliaria"
              />
              <Form.Control.Feedback type="invalid">{modalErrors?.inmobiliariaId}</Form.Control.Feedback>
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModal}>Cancelar</Button>
          <Button variant="primary"  onClick={guardar}>
            {modal.modo === "crear" ? "Crear" : "Guardar cambios"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

