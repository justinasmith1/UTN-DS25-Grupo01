// Página de Reservas: lista y CRUD simple usando el adapter.
// Muestro acciones según permisos del rol.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner, Badge } from "react-bootstrap";

import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import { useSearchParams, useNavigate } from "react-router-dom";

import {
  getAllReservas,
  createReserva,
  updateReserva,
  deleteReserva,
} from "../lib/api/reservas";

// Mapea el estado a un color de badge
const statusVariant = (s) =>
  s === "Activa" ? "success" : s === "Cancelada" ? "danger" : "secondary";

export default function Reservas() {
  // Estado base
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [searchParams] = useSearchParams();
  const lotIdParam = searchParams.get("lotId");

  // Modal de crear/editar
  const [modal, setModal] = useState({
    show: false,
    modo: "crear", // "crear" | "editar"
    datos: null,
  });

  // Toasts para feedback
  const toast = useToast();
  const success = toast?.success ?? (() => {});
  const error = toast?.error ?? (() => {});

  // Usuario y permisos
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

  // Cargo la lista (si soy INMOBILIARIA, filtro por su id)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // Armo los filtros a enviar al adapter
        const params = {};

        // Si soy INMOBILIARIA, filtro por su id
        if (user?.role === "INMOBILIARIA" && user?.inmobiliariaId) {
          params.inmobiliariaId = user.inmobiliariaId;
        }

        // Si vengo con ?lotId=..., filtro por lote
        if (lotIdParam) {
          params.lotId = lotIdParam;
        }

        const res = await getAllReservas(params);
        if (alive) setItems(res.data || []);
      } catch (e) {
        console.error(e);
        error("No pude cargar las reservas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user, lotIdParam]);

  // Abre modal vacío (crear)
  const abrirCrear = () =>
    setModal({ show: true, modo: "crear", datos: { lotId: lotIdParam || "", amount: "", observaciones: "", status: "Activa" } });

  // Abre modal con datos (editar)
  const abrirEditar = (r) => setModal({ show: true, modo: "editar", datos: { ...r } });

  // Cierra modal
  const cerrarModal = () => setModal((m) => ({ ...m, show: false }));

  // Guardar (crear o editar)
  const guardar = async () => {
    try {
      const payload = {
        lotId: String(modal.datos.lotId).trim(),
        amount: modal.datos.amount ? Number(modal.datos.amount) : null,
        observaciones: modal.datos.observaciones || "",
        status: modal.datos.status || "Activa",
        // Si soy INMOBILIARIA, fijo su id; si no, uso el que venga o null
        inmobiliariaId:
          user?.role === "INMOBILIARIA" ? user.inmobiliariaId : modal.datos.inmobiliariaId ?? null,
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
      console.error(e);
      error("No pude guardar la reserva");
    }
  };

  // Eliminar
  const eliminar = async (r) => {
    if (!window.confirm(`Eliminar la reserva ${r.id}?`)) return;
    try {
      await deleteReserva(r.id);
      setItems((prev) => prev.filter((it) => it.id !== r.id));
      success("Reserva eliminada");
    } catch (e) {
      console.error(e);
      error("No pude eliminar la reserva");
    }
  };

  // Render de la tabla
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

        {/* Muestro chip de lote cuando vengo desde el Dashboard, así se entiende el filtro aplicado */}
        {lotIdParam && (
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">Lote:</span>
            <span className="badge bg-info text-dark">{lotIdParam}</span>
          </div>
        )}

        {/* Botón + (crear) solo para quien tenga permiso */}
        {p.create && (
          <Button variant="success" onClick={abrirCrear}>
            Registrar reserva
          </Button>
        )}
      </div>

      {/* Tabla de reservas */}
      <Table hover responsive className="align-middle">
        <thead>
          <tr>
            <th>ID</th>
            <th>Lote</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Monto</th>
            <th>Inmobiliaria</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-muted py-4">
                No hay reservas para mostrar
              </td>
            </tr>
          ) : (
            items.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.lotId}</td>
                <td>{r.date || "-"}</td>
                <td>
                  <Badge bg={statusVariant(r.status)}>{r.status || "-"}</Badge>
                </td>
                <td>{r.amount != null ? `$ ${r.amount}` : "-"}</td>
                <td>{r.inmobiliariaId ?? "-"}</td>
                <td className="d-flex gap-2">
                  {/* Ver: por ahora abre el modal en modo edición pero deshabilitado sería lo ideal */}
                  {p.view && (
                    <Button size="sm" variant="outline-primary" onClick={() => abrirEditar(r)}>
                      Ver
                    </Button>
                  )}

                  {/* Editar */}
                  {p.edit && (
                    <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(r)}>
                      Editar
                    </Button>
                  )}

                  {/* Eliminar */}
                  {p.del && (
                    <Button size="sm" variant="outline-danger" onClick={() => eliminar(r)}>
                      Eliminar
                    </Button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Modal Crear/Editar */}
      <Modal show={modal.show} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {modal.modo === "crear" ? "Registrar reserva" : `Editar reserva ${modal.datos?.id}`}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/* Lote */}
          <Form.Group className="mb-3">
            <Form.Label>ID de Lote</Form.Label>
            <Form.Control
              type="text"
              value={modal.datos?.lotId ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, lotId: e.target.value } }))}
              placeholder="Ej: L003"
            />
          </Form.Group>

          {/* Monto */}
          <Form.Group className="mb-3">
            <Form.Label>Monto (opcional)</Form.Label>
            <Form.Control
              type="number"
              value={modal.datos?.amount ?? ""}
              onChange={(e) =>
                setModal((m) => ({ ...m, datos: { ...m.datos, amount: e.target.value } }))
              }
              placeholder="Ej: 150000"
            />
          </Form.Group>

          {/* Observaciones */}
          <Form.Group className="mb-3">
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={modal.datos?.observaciones ?? ""}
              onChange={(e) =>
                setModal((m) => ({ ...m, datos: { ...m.datos, observaciones: e.target.value } }))
              }
              placeholder="Notas internas"
            />
          </Form.Group>

          {/* Estado */}
          <Form.Group className="mb-2">
            <Form.Label>Estado</Form.Label>
            <Form.Select
              value={modal.datos?.status ?? "Activa"}
              onChange={(e) =>
                setModal((m) => ({ ...m, datos: { ...m.datos, status: e.target.value } }))
              }
            >
              <option>Activa</option>
              <option>Cancelada</option>
              <option>Finalizada</option>
            </Form.Select>
          </Form.Group>

          {/* Inmobiliaria (solo Admin; para INMOBILIARIA se autoasigna y no muestro el campo) */}
          {user?.role !== "INMOBILIARIA" && (
            <Form.Group>
              <Form.Label>ID Inmobiliaria (opcional)</Form.Label>
              <Form.Control
                type="number"
                value={modal.datos?.inmobiliariaId ?? ""}
                onChange={(e) =>
                  setModal((m) => ({ ...m, datos: { ...m.datos, inmobiliariaId: Number(e.target.value) || null } }))
                }
                placeholder="Ej: 101"
              />
            </Form.Group>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={guardar}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
