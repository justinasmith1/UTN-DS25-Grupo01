// Personas (Propietarios / Inquilinos). Mantengo un selector de tipo y CRUD simple.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner, ButtonGroup, ToggleButton } from "react-bootstrap";
import { useSearchParams, useNavigate } from "react-router-dom";

import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";

import {
  getAllPersonas,
  createPersona,
  updatePersona,
  deletePersona,
} from "../lib/api/personas";

const TIPOS = {
  PROPIETARIO: "PROPIETARIO",
  INQUILINO: "INQUILINO",
};

export default function Personas() {
  // Leo ?tipo= de la url; si no está, arranco en PROPIETARIO
  const [searchParams, setSearchParams] = useSearchParams();
  const tipoUrl = (searchParams.get("tipo") || "PROPIETARIO").toUpperCase();
  const tipo = TIPOS[tipoUrl] || TIPOS.PROPIETARIO;

  // Estado base
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);

  // Modal crear/editar
  const [modal, setModal] = useState({
    show: false,
    modo: "crear",
    datos: null,
  });

  // Toasts
  const toast = useToast();
  const success = toast?.success ?? (() => {});
  const error = toast?.error ?? (() => {});

  // Permisos (según tu definición, solo Admin)
  const { user } = useAuth();
  const p = useMemo(
    () => ({
      view:   can(user, PERMISSIONS.PEOPLE_VIEW ?? PERMISSIONS.PEOPLE_ACCESS),
      create: can(user, PERMISSIONS.PEOPLE_CREATE ?? PERMISSIONS.PEOPLE_ACCESS),
      edit:   can(user, PERMISSIONS.PEOPLE_EDIT ?? PERMISSIONS.PEOPLE_ACCESS),
      del:    can(user, PERMISSIONS.PEOPLE_DELETE ?? PERMISSIONS.PEOPLE_ACCESS),
    }),
    [user]
  );

  // Cargo lista cada vez que cambian tipo o q
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getAllPersonas({ tipo, q });
        if (alive) setItems(res.data || []);
      } catch (e) {
        console.error(e);
        error("No pude cargar las personas");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tipo, q]);

  // Cambio de pestaña: actualizo la URL (?tipo=...)
  const setTipo = (t) => setSearchParams({ tipo: t });

  // Modal crear
  const abrirCrear = () =>
    setModal({
      show: true,
      modo: "crear",
      datos: { tipo, nombre: "", dni: "", email: "", phone: "", address: "", notas: "" },
    });

  // Modal editar
  const abrirEditar = (p) => setModal({ show: true, modo: "editar", datos: { ...p } });

  // Cierra modal
  const cerrarModal = () => setModal((m) => ({ ...m, show: false }));

  // Guardar
  const guardar = async () => {
    try {
      const payload = {
        tipo: modal.datos.tipo, // fijo por pestaña
        nombre: (modal.datos.nombre || "").trim(),
        dni: (modal.datos.dni || "").trim(),
        email: (modal.datos.email || "").trim(),
        phone: (modal.datos.phone || "").trim(),
        address: (modal.datos.address || "").trim(),
        notas: (modal.datos.notas || "").trim(),
      };

      if (!payload.nombre) {
        error("El nombre es obligatorio");
        return;
      }

      if (modal.modo === "crear") {
        const res = await createPersona(payload);
        setItems((prev) => [res.data, ...prev]);
        success(`${payload.tipo === "PROPIETARIO" ? "Propietario" : "Inquilino"} creado`);
      } else {
        const res = await updatePersona(modal.datos.id, payload);
        setItems((prev) => prev.map((it) => (String(it.id) === String(modal.datos.id) ? res.data : it)));
        success(`${payload.tipo === "PROPIETARIO" ? "Propietario" : "Inquilino"} actualizado`);
      }
      cerrarModal();
    } catch (e) {
      console.error(e);
      error("No pude guardar la persona");
    }
  };

  // Eliminar
  const eliminar = async (pRow) => {
    if (!window.confirm(`Eliminar ${pRow.tipo.toLowerCase()} "${pRow.nombre}"?`)) return;
    try {
      await deletePersona(pRow.id);
      setItems((prev) => prev.filter((it) => String(it.id) !== String(pRow.id)));
      success("Eliminado correctamente");
    } catch (e) {
      console.error(e);
      error("No pude eliminar");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
        <Spinner animation="border" role="status" />
        <span className="ms-2">Cargando {tipo === "PROPIETARIO" ? "propietarios" : "inquilinos"}…</span>
      </div>
    );
  }

  return (
    <div className="container py-3">
      {/* Header con selector de tipo, buscador y botón crear */}
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <h5 className="m-0">Personas</h5>
          <ButtonGroup>
            <ToggleButton
              id="tipo-prop"
              type="radio"
              variant={tipo === "PROPIETARIO" ? "success" : "outline-success"}
              checked={tipo === "PROPIETARIO"}
              value="PROPIETARIO"
              onChange={() => setTipo("PROPIETARIO")}
            >
              Propietarios
            </ToggleButton>
            <ToggleButton
              id="tipo-inq"
              type="radio"
              variant={tipo === "INQUILINO" ? "success" : "outline-success"}
              checked={tipo === "INQUILINO"}
              value="INQUILINO"
              onChange={() => setTipo("INQUILINO")}
            >
              Inquilinos
            </ToggleButton>
          </ButtonGroup>
        </div>

        <div className="d-flex gap-2">
          <Form.Control
            size="sm"
            type="search"
            placeholder="Buscar por nombre, email o DNI…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {p.create && (
            <Button size="sm" variant="success" onClick={abrirCrear}>
              {tipo === "PROPIETARIO" ? "Nuevo propietario" : "Nuevo inquilino"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <Table hover responsive className="align-middle">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tipo</th>
            <th>Nombre</th>
            <th>DNI</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-muted py-4">
                No hay {tipo === "PROPIETARIO" ? "propietarios" : "inquilinos"} para mostrar
              </td>
            </tr>
          ) : (
            items.map((pRow) => (
              <tr key={pRow.id}>
                <td>{pRow.id}</td>
                <td>{pRow.tipo}</td>
                <td>{pRow.nombre || "-"}</td>
                <td>{pRow.dni || "-"}</td>
                <td>{pRow.email || "-"}</td>
                <td>{pRow.phone || "-"}</td>
                <td className="d-flex gap-2">
                  {p.view && (
                    <Button size="sm" variant="outline-primary" onClick={() => abrirEditar(pRow)}>
                      Ver
                    </Button>
                  )}
                  {p.edit && (
                    <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(pRow)}>
                      Editar
                    </Button>
                  )}
                  {p.del && (
                    <Button size="sm" variant="outline-danger" onClick={() => eliminar(pRow)}>
                      Eliminar
                    </Button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Modal crear/editar */}
      <Modal show={modal.show} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {modal.modo === "crear"
              ? `Registrar ${tipo === "PROPIETARIO" ? "propietario" : "inquilino"}`
              : `Editar ${modal.datos?.tipo?.toLowerCase()} ${modal.datos?.id}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Tipo</Form.Label>
            <Form.Control value={modal.datos?.tipo ?? tipo} disabled />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Nombre *</Form.Label>
            <Form.Control
              value={modal.datos?.nombre ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, nombre: e.target.value } }))}
              placeholder="Nombre y apellido"
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>DNI</Form.Label>
            <Form.Control
              value={modal.datos?.dni ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, dni: e.target.value } }))}
              placeholder="Ej: 12345678"
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={modal.datos?.email ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, email: e.target.value } }))}
              placeholder="correo@ejemplo.com"
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              value={modal.datos?.phone ?? ""}
              onChange={(e) => setModal((m) => ({ ...m, datos: { ...m.datos, phone: e.target.value } }))}
              placeholder="11-5555-5555"
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
