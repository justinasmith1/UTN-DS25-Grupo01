// src/pages/Inmobiliarias.jsx
// CRUD de Inmobiliarias con errores del back mapeados a campos del modal.
// Persiste búsqueda/orden/paginado en la URL, mantiene permisos y toasts.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner, Pagination } from "react-bootstrap";
import { useSearchParams, useNavigate } from "react-router-dom";

import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import { parseApiError, mapApiValidationToFields } from "../lib/http/errors";

import {
  getAllInmobiliarias,
  createInmobiliaria,
  updateInmobiliaria,
  deleteInmobiliaria,
} from "../lib/api/inmobiliarias";

export default function Inmobiliarias() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const q        = searchParams.get("q") || "";
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));
  const sortBy   = searchParams.get("sortBy")  || "name";
  const sortDir  = (searchParams.get("sortDir") || "asc").toLowerCase();

  const [modal, setModal] = useState({ show: false, modo: "crear", datos: null });
  const [modalErrors, setModalErrors] = useState({});
  const [formError, setFormError] = useState("");

  const toast = useToast();
  const success = toast?.success ?? (() => {});
  const error = toast?.error ?? (() => {});

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

  const setQS = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const params = { q, page, pageSize, sortBy, sortDir };
        const res = await getAllInmobiliarias(params);
        if (alive) { setItems(res.data || []); setTotal(res.meta?.total ?? (res.data?.length ?? 0)); }
      } catch (e) {
        error(parseApiError(e, "No pude cargar las inmobiliarias"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [q, page, pageSize, sortBy, sortDir]);

  const abrirCrear = () => {
    setFormError(""); setModalErrors({});
    setModal({ show: true, modo: "crear", datos: { name: "", email: "", phone: "", address: "" } });
  };
  const abrirEditar = (a) => { setFormError(""); setModalErrors({}); setModal({ show: true, modo: "editar", datos: { ...a } }); };
  const cerrarModal = () => setModal((m) => ({ ...m, show: false }));

  const onChange = (field) => (e) => {
    const value = e?.target?.value ?? e;
    setModal((m) => ({ ...m, datos: { ...m.datos, [field]: value } }));
    if (modalErrors[field]) setModalErrors((x) => ({ ...x, [field]: null }));
  };

  const guardar = async () => {
    try {
      setFormError(""); setModalErrors({});
      const payload = {
        name: (modal.datos.name || "").trim(),
        email: (modal.datos.email || "").trim(),
        phone: (modal.datos.phone || "").trim(),
        address: (modal.datos.address || "").trim(),
      };
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
      error(parseApiError(e, "No pude guardar la inmobiliaria"));
      const { formError, fieldErrors } = mapApiValidationToFields(e);
      if (formError) setFormError(formError);
      if (fieldErrors && Object.keys(fieldErrors).length) setModalErrors(fieldErrors);
    }
  };

  const eliminar = async (a) => {
    if (!window.confirm(`Eliminar la inmobiliaria "${a.name}"?`)) return;
    try {
      await deleteInmobiliaria(a.id);
      setItems((prev) => prev.filter((it) => String(it.id) !== String(a.id)));
      setTotal((t) => Math.max(0, t - 1));
      success("Inmobiliaria eliminada");
    } catch (e) {
      error(parseApiError(e, "No pude eliminar la inmobiliaria"));
    }
  };

  const onSearchChange = (e) => setQS({ q: e.target.value, page: 1 });
  const toggleSort = (field) => (sortBy === field ? setQS({ sortDir: sortDir === "asc" ? "desc" : "asc", page: 1 }) : setQS({ sortBy: field, sortDir: "asc", page: 1 }));
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
          <Form.Control size="sm" type="search" placeholder="Buscar por nombre, email o teléfono…" value={q} onChange={onSearchChange} style={{ minWidth: 260 }} />
          {p.create && <Button size="sm" variant="success" onClick={abrirCrear}>Nueva inmobiliaria</Button>}
        </div>
      </div>

      <Table hover responsive className="align-middle">
        <thead>
          <tr>
            <ThSort label="ID" field="id" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Nombre" field="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Email" field="email" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Teléfono" field="phone" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <th>Dirección</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).length === 0 ? (
            <tr><td colSpan={6} className="text-center text-muted py-4">No hay inmobiliarias para mostrar</td></tr>
          ) : (
            items.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td><td>{a.name || "-"}</td><td>{a.email || "-"}</td><td>{a.phone || "-"}</td><td>{a.address || "-"}</td>
                <td className="d-flex flex-wrap gap-2">
                  {p.view && <Button size="sm" variant="outline-primary" onClick={() => abrirEditar(a)}>Ver</Button>}
                  {p.edit && <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(a)}>Editar</Button>}
                  {p.del  && <Button size="sm" variant="outline-danger"  onClick={() => eliminar(a)}>Eliminar</Button>}
                  <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/ventas?inmobiliariaId=${a.id}`)}>Ventas realizadas</Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      {/* paginado */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="text-muted small">Mostrando página {page} de {totalPages} — Total: {total}</div>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">Filas por página</span>
            <Form.Select size="sm" value={pageSize} onChange={(e) => setQS({ pageSize: Number(e.target.value), page: 1 })} style={{ width: 100 }}>
              <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
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

      {/* Modal Crear/Editar con errores por campo */}
      <Modal show={modal.show} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modal.modo === "crear" ? "Nueva inmobiliaria" : `Editar inmobiliaria ${modal.datos?.id}`}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && <div className="alert alert-danger py-2">{formError}</div>}

          <Form.Group className="mb-3">
            <Form.Label>Nombre *</Form.Label>
            <Form.Control
              value={modal.datos?.name ?? ""}
              isInvalid={!!modalErrors?.name}
              onChange={onChange("name")}
              placeholder="Ej: López Propiedades"
            />
            <Form.Control.Feedback type="invalid">{modalErrors?.name}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={modal.datos?.email ?? ""}
              isInvalid={!!modalErrors?.email}
              onChange={onChange("email")}
              placeholder="correo@ejemplo.com"
            />
            <Form.Control.Feedback type="invalid">{modalErrors?.email}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              value={modal.datos?.phone ?? ""}
              isInvalid={!!modalErrors?.phone}
              onChange={onChange("phone")}
              placeholder="Ej: 11-5555-5555"
            />
            <Form.Control.Feedback type="invalid">{modalErrors?.phone}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label>Dirección</Form.Label>
            <Form.Control
              value={modal.datos?.address ?? ""}
              isInvalid={!!modalErrors?.address}
              onChange={onChange("address")}
              placeholder="Calle 123"
            />
            <Form.Control.Feedback type="invalid">{modalErrors?.address}</Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModal}>Cancelar</Button>
          <Button variant="primary"  onClick={guardar}>{modal.modo === "crear" ? "Crear" : "Guardar cambios"}</Button>
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
