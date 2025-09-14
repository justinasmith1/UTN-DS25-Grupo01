// Personas (Propietarios / Inquilinos). Uso ?tipo= en la URL para pestaña,
// y además q/sort/paginado también en la URL para persistir el estado.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner, ButtonGroup, ToggleButton, Pagination } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import { parseApiError } from "../lib/http/errors";

import {
  getAllPersonas,
  createPersona,
  updatePersona,
  deletePersona,
} from "../lib/api/personas";

const TIPOS = { PROPIETARIO: "PROPIETARIO", INQUILINO: "INQUILINO" };

export default function Personas() {
  // leo ?tipo= de la URL (default PROPIETARIO)
  const [searchParams, setSearchParams] = useSearchParams();
  const tipoUrl = (searchParams.get("tipo") || "PROPIETARIO").toUpperCase();
  const tipo = TIPOS[tipoUrl] || TIPOS.PROPIETARIO;

  // leo también estado de lista desde la URL
  const q        = searchParams.get("q") || "";
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));
  const sortBy   = searchParams.get("sortBy")  || "nombre";           // nombre | email | dni | id | tipo
  const sortDir  = (searchParams.get("sortDir") || "asc").toLowerCase(); // asc | desc

  // estado base
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // modal crear/editar
  const [modal, setModal] = useState({ show: false, modo: "crear", datos: null });

  // toasts
  const toast = useToast();
  const success = toast?.success ?? (() => {});
  const error = toast?.error ?? (() => {});

  // permisos
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

  // helper para actualizar la URL sin volar otros params (incluido tipo)
  const setQS = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next);
  };

  // cambio de pestaña: seteo tipo y reseteo a página 1
  const setTipo = (t) => setQS({ tipo: t, page: 1 });

  // cargo lista cada vez que cambian tipo/q/sort/paginado
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const params = { tipo, q, page, pageSize, sortBy, sortDir };
        const res = await getAllPersonas(params);
        if (alive) {
          setItems(res.data || []);
          setTotal(res.meta?.total ?? (res.data?.length ?? 0));
        }
      } catch (e) {
        console.error(e);
        error(parseApiError(e, "No pude cargar las personas"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tipo, q, page, pageSize, sortBy, sortDir]);

  // abrir modal crear
  const abrirCrear = () =>
    setModal({
      show: true,
      modo: "crear",
      datos: { tipo, nombre: "", dni: "", email: "", phone: "", address: "", notas: "" },
    });

  // abrir modal editar
  const abrirEditar = (row) => setModal({ show: true, modo: "editar", datos: { ...row } });

  // cerrar modal
  const cerrarModal = () => setModal((m) => ({ ...m, show: false }));

  // guardar
  const guardar = async () => {
    try {
      const payload = {
        tipo: modal.datos.tipo,
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
        setTotal((t) => t + 1);
        success(`${payload.tipo === "PROPIETARIO" ? "Propietario" : "Inquilino"} creado`);
      } else {
        const res = await updatePersona(modal.datos.id, payload);
        setItems((prev) => prev.map((it) => (String(it.id) === String(modal.datos.id) ? res.data : it)));
        success(`${payload.tipo === "PROPIETARIO" ? "Propietario" : "Inquilino"} actualizado`);
      }
      cerrarModal();
    } catch (e) {
      console.error(e);
      error(parseApiError(e, "No pude guardar la persona"));
    }
  };

  // eliminar
  const eliminar = async (row) => {
    if (!window.confirm(`Eliminar ${row.tipo.toLowerCase()} "${row.nombre}"?`)) return;
    try {
      await deletePersona(row.id);
      setItems((prev) => prev.filter((it) => String(it.id) !== String(row.id)));
      setTotal((t) => Math.max(0, t - 1));
      success("Eliminado correctamente");
    } catch (e) {
      console.error(e);
      error(parseApiError(e, "No pude eliminar"));
    }
  };

  // handlers de búsqueda/orden/paginado
  const onSearchChange = (e) => setQS({ q: e.target.value, page: 1 });

  const toggleSort = (field) => {
    if (sortBy === field) setQS({ sortDir: sortDir === "asc" ? "desc" : "asc", page: 1 });
    else setQS({ sortBy: field, sortDir: "asc", page: 1 });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const goPage = (p) => setQS({ page: p });

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
            onChange={onSearchChange}
            style={{ minWidth: 260 }}
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
            <ThSort label="ID"      field="id"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Tipo"    field="tipo"   sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Nombre"  field="nombre" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="DNI"     field="dni"    sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Email"   field="email"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
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
            items.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.tipo}</td>
                <td>{row.nombre || "-"}</td>
                <td>{row.dni || "-"}</td>
                <td>{row.email || "-"}</td>
                <td>{row.phone || "-"}</td>
                <td className="d-flex gap-2">
                  {p.view && (
                    <Button size="sm" variant="outline-primary" onClick={() => abrirEditar(row)}>
                      Ver
                    </Button>
                  )}
                  {p.edit && (
                    <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(row)}>
                      Editar
                    </Button>
                  )}
                  {p.del && (
                    <Button size="sm" variant="outline-danger" onClick={() => eliminar(row)}>
                      Eliminar
                    </Button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* Paginado */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted small">
          Mostrando página {page} de {Math.max(1, Math.ceil(total / pageSize))} — Total: {total}
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">Filas por página</span>
            <Form.Select
              size="sm"
              value={pageSize}
              onChange={(e) => setQS({ pageSize: Number(e.target.value), page: 1 })}
              style={{ width: 100 }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Form.Select>
          </div>

          <Pagination className="mb-0">
            <Pagination.First disabled={page <= 1} onClick={() => goPage(1)} />
            <Pagination.Prev  disabled={page <= 1} onClick={() => goPage(page - 1)} />
            <Pagination.Item active>{page}</Pagination.Item>
            <Pagination.Next  disabled={page >= Math.max(1, Math.ceil(total / pageSize))} onClick={() => goPage(page + 1)} />
            <Pagination.Last  disabled={page >= Math.max(1, Math.ceil(total / pageSize))} onClick={() => goPage(Math.max(1, Math.ceil(total / pageSize)))} />
          </Pagination>
        </div>
      </div>

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
          <Button variant="secondary" onClick={cerrarModal}>Cancelar</Button>
          <Button variant="primary" onClick={guardar}>Guardar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// Encabezado ordenable
function ThSort({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field;
  const arrow = !active ? "" : sortDir === "asc" ? " ▲" : " ▼";
  return (
    <th role="button" onClick={() => onSort(field)} className="user-select-none">
      {label}{arrow}
    </th>
  );
}
