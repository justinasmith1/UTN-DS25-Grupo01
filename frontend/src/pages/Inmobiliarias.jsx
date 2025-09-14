// CRUD simple de Inmobiliarias. Mantengo campos básicos y filtro por búsqueda.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner } from "react-bootstrap";

import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";

import {useNavigate} from "react-router-dom";

import {
  getAllInmobiliarias,
  createInmobiliaria,
  updateInmobiliaria,
  deleteInmobiliaria,
} from "../lib/api/inmobiliarias";

export default function Inmobiliarias() {
  // estado base
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState(""); // texto de búsqueda
  const navigate = useNavigate();

  // modal crear/editar
  const [modal, setModal] = useState({
    show: false,
    modo: "crear", // "crear" | "editar"
    datos: null,
  });

  // toasts
  const toast = useToast();
  const success = toast?.success ?? (() => {});
  const error = toast?.error ?? (() => {});

  // permisos (según tu definición: solo Admin accede a este módulo)
  const { user } = useAuth();
  const p = useMemo(
    () => ({
      view:   can(user, PERMISSIONS.AGENCY_VIEW ?? PERMISSIONS.AGENCY_ACCESS), // si no tenés AGENCY_VIEW, uso ACCESS
      create: can(user, PERMISSIONS.AGENCY_CREATE ?? PERMISSIONS.AGENCY_ACCESS),
      edit:   can(user, PERMISSIONS.AGENCY_EDIT ?? PERMISSIONS.AGENCY_ACCESS),
      del:    can(user, PERMISSIONS.AGENCY_DELETE ?? PERMISSIONS.AGENCY_ACCESS),
    }),
    [user]
  );

  // carga inicial + cada vez que cambia el buscador (q)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getAllInmobiliarias({ q });
        if (alive) setItems(res.data || []);
      } catch (e) {
        console.error(e);
        error("No pude cargar las inmobiliarias");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [q]);

  // abrir modal crear
  const abrirCrear = () =>
    setModal({
      show: true,
      modo: "crear",
      datos: { name: "", email: "", phone: "", address: "" },
    });

  // abrir modal editar
  const abrirEditar = (a) => setModal({ show: true, modo: "editar", datos: { ...a } });

  // cerrar modal
  const cerrarModal = () => setModal((m) => ({ ...m, show: false }));

  // guardar (crear / editar)
  const guardar = async () => {
    try {
      const payload = {
        name: (modal.datos.name || "").trim(),
        email: (modal.datos.email || "").trim(),
        phone: (modal.datos.phone || "").trim(),
        address: (modal.datos.address || "").trim(),
      };

      if (!payload.name) {
        error("El nombre es obligatorio");
        return;
      }

      if (modal.modo === "crear") {
        const res = await createInmobiliaria(payload);
        setItems((prev) => [res.data, ...prev]);
        success("Inmobiliaria creada");
      } else {
        const res = await updateInmobiliaria(modal.datos.id, payload);
        setItems((prev) => prev.map((it) => (String(it.id) === String(modal.datos.id) ? res.data : it)));
        success("Inmobiliaria actualizada");
      }
      cerrarModal();
    } catch (e) {
      console.error(e);
      error("No pude guardar la inmobiliaria");
    }
  };

  // eliminar
  const eliminar = async (a) => {
    if (!window.confirm(`Eliminar la inmobiliaria "${a.name}"?`)) return;
    try {
      await deleteInmobiliaria(a.id);
      setItems((prev) => prev.filter((it) => String(it.id) !== String(a.id)));
      success("Inmobiliaria eliminada");
    } catch (e) {
      console.error(e);
      error("No pude eliminar la inmobiliaria");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <Spinner animation="border" role="status" />
        <span className="ms-2">Cargando inmobiliarias…</span>
      </div>
    );
  }

  return (
    <div className="container py-3">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h5 className="m-0">Inmobiliarias</h5>

        <div className="d-flex gap-2">
          {/* buscador simple */}
          <Form.Control
            size="sm"
            type="search"
            placeholder="Buscar por nombre o email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {p.create && (
            <Button size="sm" variant="success" onClick={abrirCrear}>
              Nueva inmobiliaria
            </Button>
          )}
        </div>
      </div>

      <Table hover responsive className="align-middle">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-muted py-4">
                No hay inmobiliarias para mostrar
              </td>
            </tr>
          ) : (
            items.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.name || "-"}</td>
                <td>{a.email || "-"}</td>
                <td>{a.phone || "-"}</td>
                <td>{a.address || "-"}</td>
                <td className="d-flex gap-2">
                  {p.view && (
                    <Button size="sm" variant="outline-primary" onClick={() => abrirEditar(a)}>
                      Ver
                    </Button>
                  )}
                  {p.edit && (
                    <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(a)}>
                      Editar
                    </Button>
                  )}
                  {p.del && (
                    <Button size="sm" variant="outline-danger" onClick={() => eliminar(a)}>
                      Eliminar
                    </Button>
                  )}
                    {/* ✅ Ventas realizadas: voy a Ventas con el filtro aplicado */}
                    {/* Nota: esto sólo se muestra si el usuario también tiene acceso al módulo Ventas */}
                    <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => navigate(`/ventas?inmobiliariaId=${a.id}`)}
                    >
                        Ventas realizadas
                    </Button>
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
            {modal.modo === "crear" ? "Nueva inmobiliaria" : `Editar inmobiliaria ${modal.datos?.id}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nombre *</Form.Label>
            <Form.Control
              value={modal.datos?.name ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, name: e.target.value } }))}
              placeholder="Ej: López Propiedades"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={modal.datos?.email ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, email: e.target.value } }))}
              placeholder="correo@ejemplo.com"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              value={modal.datos?.phone ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, phone: e.target.value } }))}
              placeholder="Ej: 11-5555-5555"
            />
          </Form.Group>
          <Form.Group className="mb-0">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              value={modal.datos?.address ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, address: e.target.value } }))}
              placeholder="Calle 123, Ciudad"
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
