// Página de Ventas: lista + crear/editar/eliminar. Respeta permisos del rol.
// Mantengo los campos simples: lotId, amount, observaciones, status, inmobiliariaId.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner, Badge } from "react-bootstrap";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import { useSearchParams, useNavigate } from "react-router-dom";

import {
  getAllVentas,
  createVenta,
  updateVenta,
  deleteVenta,
} from "../lib/api/ventas";

// color del badge por estado
const statusVariant = (s) =>
  s === "Registrada" ? "success" : s === "Anulada" ? "danger" : "secondary";

export default function Ventas() {
  // estado base
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
   const filtroInmoId = searchParams.get("inmobiliariaId");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  // modal crear/editar
  const [modal, setModal] = useState({
    show: false,
    modo: "crear",
    datos: null,
  });

  // toasts
  const toast = useToast();
  const success = toast?.success ?? (() => {});
  const error = toast?.error ?? (() => {});

  // auth y permisos
  const { user } = useAuth();
  const p = useMemo(
    () => ({
      view:   can(user, PERMISSIONS.SALE_VIEW),
      create: can(user, PERMISSIONS.SALE_CREATE),
      edit:   can(user, PERMISSIONS.SALE_EDIT),
      del:    can(user, PERMISSIONS.SALE_DELETE),
    }),
    [user]
  );

  // Cargo lista: si viene inmobiliariaId en la URL, la uso como filtro
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const params = {};
        if (filtroInmoId) {
          // guardo como number si aplica, si no, en string
          params.inmobiliariaId = Number(filtroInmoId) || filtroInmoId;
        }
        const res = await getAllVentas(params);
        if (alive) setItems(res.data || []);
      } catch (e) {
        console.error(e);
        error("No pude cargar las ventas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [filtroInmoId]); // ← si cambia el query, recargo

  // abrir modal crear
  const abrirCrear = () =>
    setModal({ show: true, modo: "crear", datos: { lotId: "", amount: "", observaciones: "", status: "Registrada",
        inmobiliariaId: filtroInmoId ? Number(filtroInmoId) || filtroInmoId : "",
      },
     });

  // abrir modal editar
  const abrirEditar = (v) => setModal({ show: true, modo: "editar", datos: { ...v } });

  // cerrar modal
  const cerrarModal = () => setModal((m) => ({ ...m, show: false }));

  // guardar (crear o editar)
  const guardar = async () => {
    try {
      const payload = {
        lotId: String(modal.datos.lotId).trim(),
        amount: modal.datos.amount ? Number(modal.datos.amount) : null,
        observaciones: modal.datos.observaciones || "",
        status: modal.datos.status || "Registrada",
        inmobiliariaId: modal.datos.inmobiliariaId ?? null,
      };

      if (modal.modo === "crear") {
        const res = await createVenta(payload);
        setItems((prev) => [res.data, ...prev]);
        success("Venta registrada");
      } else {
        const res = await updateVenta(modal.datos.id, payload);
        setItems((prev) => prev.map((it) => (it.id === modal.datos.id ? res.data : it)));
        success("Venta actualizada");
      }
      cerrarModal();
    } catch (e) {
      console.error(e);
      error("No pude guardar la venta");
    }
  };

  // eliminar
  const eliminar = async (v) => {
    if (!window.confirm(`Eliminar la venta ${v.id}?`)) return;
    try {
      await deleteVenta(v.id);
      setItems((prev) => prev.filter((it) => it.id !== v.id));
      success("Venta eliminada");
    } catch (e) {
      console.error(e);
      error("No pude eliminar la venta");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <Spinner animation="border" role="status" />
        <span className="ms-2">Cargando ventas…</span>
      </div>
    );
  }

  return (
    <div className="container py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="m-0">Ventas</h5>

        <div className="d-flex align-items-center gap-2">
          {/* Si estoy filtrando por inmobiliaria, lo muestro y doy opción de limpiar */}
          {filtroInmoId && (
            <>
              <span className="small text-muted">Filtrado por Inmobiliaria:</span>
              <span className="badge bg-info text-dark">{filtroInmoId}</span>
              <Button size="sm" variant="outline-secondary" onClick={() => navigate("/ventas")}>
                Quitar filtro
              </Button>
            </>
          )}

          {p.create && (
            <Button variant="success" onClick={abrirCrear}>
              Registrar venta
            </Button>
          )}
        </div>
      </div>

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
                No hay ventas para mostrar
              </td>
            </tr>
          ) : (
            items.map((v) => (
              <tr key={v.id}>
                <td>{v.id}</td>
                <td>{v.lotId}</td>
                <td>{v.date || "-"}</td>
                <td><Badge bg={statusVariant(v.status)}>{v.status || "-"}</Badge></td>
                <td>{v.amount != null ? `$ ${v.amount}` : "-"}</td>
                <td>{v.inmobiliariaId ?? "-"}</td>
                <td className="d-flex gap-2">
                  {p.view && (
                    <Button size="sm" variant="outline-primary" onClick={() => abrirEditar(v)}>
                      Ver
                    </Button>
                  )}
                  {p.edit && (
                    <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(v)}>
                      Editar
                    </Button>
                  )}
                  {p.del && (
                    <Button size="sm" variant="outline-danger" onClick={() => eliminar(v)}>
                      Eliminar
                    </Button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <Modal show={modal.show} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {modal.modo === "crear" ? "Registrar venta" : `Editar venta ${modal.datos?.id}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>ID de Lote</Form.Label>
            <Form.Control
              type="text"
              value={modal.datos?.lotId ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, lotId: e.target.value } }))}
              placeholder="Ej: L003"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Monto</Form.Label>
            <Form.Control
              type="number"
              value={modal.datos?.amount ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, amount: e.target.value } }))}
              placeholder="Ej: 250000"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={modal.datos?.observaciones ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, observaciones: e.target.value } }))}
              placeholder="Notas internas"
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Estado</Form.Label>
            <Form.Select
              value={modal.datos?.status ?? "Registrada"}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, status: e.target.value } }))}
            >
              <option>Registrada</option>
              <option>Anulada</option>
              <option>Finalizada</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>ID Inmobiliaria (opcional)</Form.Label>
            <Form.Control
              type="number"
              value={modal.datos?.inmobiliariaId ?? ""}
              onChange={(e) =>
                setModal((m) => ({
                  ...m,
                  datos: { ...m.datos, inmobiliariaId: Number(e.target.value) || null },
                }))
              }
              placeholder="Ej: 101"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModal}>Cancelar</Button>
          <Button variant="primary" onClick={guardar}>Guardar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
