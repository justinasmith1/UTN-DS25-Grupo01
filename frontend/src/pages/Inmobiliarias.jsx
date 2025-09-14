// CRUD de Inmobiliarias con búsqueda, orden y paginado en la URL.
// De esta forma, si recargo o comparto el link, se mantiene el estado.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner, Pagination } from "react-bootstrap";
import { useSearchParams, useNavigate } from "react-router-dom";

import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import { parseApiError } from "../lib/http/errors";

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
  const [total, setTotal] = useState(0); // total para paginado

  // querystring
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // leo parámetros de la URL (con defaults)
  const q        = searchParams.get("q") || "";
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));
  const sortBy   = searchParams.get("sortBy")  || "name"; // name | email | phone | id
  const sortDir  = (searchParams.get("sortDir") || "asc").toLowerCase(); // asc | desc

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

  // permisos (según tu definición: solo Admin)
  const { user } = useAuth();
  const p = useMemo(
    () => ({
      view:   can(user, PERMISSIONS.AGENCY_VIEW ?? PERMISSIONS.AGENCY_ACCESS),
      create: can(user, PERMISSIONS.AGENCY_CREATE ?? PERMISSIONS.AGENCY_ACCESS),
      edit:   can(user, PERMISSIONS.AGENCY_EDIT ?? PERMISSIONS.AGENCY_ACCESS),
      del:    can(user, PERMISSIONS.AGENCY_DELETE ?? PERMISSIONS.AGENCY_ACCESS),
    }),
    [user]
  );

  // helper para setear querystring sin perder lo demás
  const setQS = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next);
  };

  // cargo lista cada vez que cambian q/sort/paginado
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const params = { q, page, pageSize, sortBy, sortDir };
        const res = await getAllInmobiliarias(params);
        if (alive) {
          setItems(res.data || []);
          setTotal(res.meta?.total ?? (res.data?.length ?? 0));
        }
      } catch (e) {
        console.error(e);
        error(parseApiError(e, "No pude cargar las inmobiliarias"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [q, page, pageSize, sortBy, sortDir]);

  // abrir modal crear
  const abrirCrear = () =>
    setModal({ show: true, modo: "crear", datos: { name: "", email: "", phone: "", address: "" } });

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
        setTotal((t) => t + 1);
        success("Inmobiliaria creada");
      } else {
        const res = await updateInmobiliaria(modal.datos.id, payload);
        setItems((prev) => prev.map((it) => (String(it.id) === String(modal.datos.id) ? res.data : it)));
        success("Inmobiliaria actualizada");
      }
      cerrarModal();
    } catch (e) {
      console.error(e);
      error(parseApiError(e, "No pude guardar la inmobiliaria"));
    }
  };

  // eliminar
  const eliminar = async (a) => {
    if (!window.confirm(`Eliminar la inmobiliaria "${a.name}"?`)) return;
    try {
      await deleteInmobiliaria(a.id);
      setItems((prev) => prev.filter((it) => String(it.id) !== String(a.id)));
      setTotal((t) => Math.max(0, t - 1));
      success("Inmobiliaria eliminada");
    } catch (e) {
      console.error(e);
      error(parseApiError(e, "No pude eliminar la inmobiliaria"));
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
        <span className="ms-2">Cargando inmobiliarias…</span>
      </div>
    );
  }

  return (
    <div className="container py-3">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <h5 className="m-0">Inmobiliarias</h5>

        <div className="d-flex gap-2">
          {/* buscador simple que persiste en la URL */}
          <Form.Control
            size="sm"
            type="search"
            placeholder="Buscar por nombre, email o teléfono…"
            value={q}
            onChange={onSearchChange}
            style={{ minWidth: 260 }}
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
            <ThSort label="ID"      field="id"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Nombre"  field="name"   sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Email"   field="email"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Teléfono" field="phone" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
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
                <td className="d-flex flex-wrap gap-2">
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
                  {/* Ventas realizadas → voy a /ventas?inmobiliariaId=... */}
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

      {/* paginado */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted small">
          Mostrando página {page} de {totalPages} — Total: {total}
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
            <Pagination.Next  disabled={page >= totalPages} onClick={() => goPage(page + 1)} />
            <Pagination.Last  disabled={page >= totalPages} onClick={() => goPage(totalPages)} />
          </Pagination>
        </div>
      </div>

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

// Encabezado ordenable (click alterna asc/desc)
function ThSort({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field;
  const arrow = !active ? "" : sortDir === "asc" ? " ▲" : " ▼";
  return (
    <th role="button" onClick={() => onSort(field)} className="user-select-none">
      {label}{arrow}
    </th>
  );
}
