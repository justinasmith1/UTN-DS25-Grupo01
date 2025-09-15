// src/pages/Ventas.jsx
// Lista + CRUD de Ventas con mapeo de errores del backend a campos del modal.
// Conserva filtros cruzados (?inmobiliariaId, ?lotId), q/sort/paginación, permisos y toasts.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner, Badge, Pagination } from "react-bootstrap";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import { useSearchParams, useNavigate } from "react-router-dom";
import { parseApiError, mapApiValidationToFields } from "../lib/http/errors";

import {
  getAllVentas,
  createVenta,
  updateVenta,
  deleteVenta,
} from "../lib/api/ventas";

const statusVariant = (s) =>
  s === "Registrada" ? "success" : s === "Anulada" ? "danger" : "secondary";

export default function Ventas() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const filtroInmoId = searchParams.get("inmobiliariaId");
  const lotIdParam   = searchParams.get("lotId");
  const q        = searchParams.get("q") || "";
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));
  const sortBy   = searchParams.get("sortBy")  || "date";
  const sortDir  = (searchParams.get("sortDir") || "desc").toLowerCase();

  // modal y errores
  const [modal, setModal] = useState({ show: false, modo: "crear", datos: null });
  const [modalErrors, setModalErrors] = useState({});
  const [formError, setFormError] = useState("");

  const toast = useToast();
  const success = toast?.success ?? (() => {});
  const error = toast?.error ?? (() => {});

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
        if (filtroInmoId) params.inmobiliariaId = Number(filtroInmoId) || filtroInmoId;
        if (lotIdParam)   params.lotId = lotIdParam;
        const res = await getAllVentas(params);
        if (alive) { setItems(res.data || []); setTotal(res.meta?.total ?? (res.data?.length ?? 0)); }
      } catch (e) {
        error(parseApiError(e, "No pude cargar las ventas"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [q, page, pageSize, sortBy, sortDir, filtroInmoId, lotIdParam]);

  const abrirCrear = () => {
    setFormError(""); setModalErrors({});
    setModal({
      show: true, modo: "crear",
      datos: {
        lotId: lotIdParam || "", amount: "", observaciones: "", status: "Registrada",
        inmobiliariaId: filtroInmoId ? Number(filtroInmoId) || filtroInmoId : "",
      },
    });
  };
  const abrirEditar = (v) => { setFormError(""); setModalErrors({}); setModal({ show: true, modo: "editar", datos: { ...v } }); };
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
        lotId: String(modal.datos.lotId).trim(),
        amount: modal.datos.amount ? Number(modal.datos.amount) : null,
        observaciones: modal.datos.observaciones || "",
        status: modal.datos.status || "Registrada",
        inmobiliariaId: modal.datos.inmobiliariaId ?? null,
      };

      if (modal.modo === "crear") {
        const res = await createVenta(payload);
        setItems((prev) => [res.data, ...prev]);
        setTotal((t) => t + 1);
        success("Venta registrada");
      } else {
        const res = await updateVenta(modal.datos.id, payload);
        setItems((prev) => prev.map((it) => (it.id === modal.datos.id ? res.data : it)));
        success("Venta actualizada");
      }
      cerrarModal();
    } catch (e) {
      error(parseApiError(e, "No pude guardar la venta"));
      const { formError, fieldErrors } = mapApiValidationToFields(e);
      if (formError) setFormError(formError);
      if (fieldErrors && Object.keys(fieldErrors).length) setModalErrors(fieldErrors);
    }
  };

  const eliminar = async (v) => {
    if (!window.confirm(`Eliminar la venta ${v.id}?`)) return;
    try {
      await deleteVenta(v.id);
      setItems((prev) => prev.filter((it) => it.id !== v.id));
      setTotal((t) => Math.max(0, t - 1));
      success("Venta eliminada");
    } catch (e) {
      error(parseApiError(e, "No pude eliminar la venta"));
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
        <span className="ms-2">Cargando ventas…</span>
      </div>
    );
  }

  return (
    <div className="container py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h5 className="m-0">Ventas</h5>

        <div className="d-flex align-items-center gap-2">
          <Form.Control
            size="sm" type="search" placeholder="Buscar por ID, lote u observaciones…"
            value={q} onChange={onSearchChange} style={{ minWidth: 260 }}
          />

          {filtroInmoId && (
            <>
              <span className="small text-muted">Inmobiliaria:</span>
              <span className="badge bg-info text-dark">{filtroInmoId}</span>
              <Button size="sm" variant="outline-secondary" onClick={() => navigate("/ventas")}>Quitar filtro</Button>
            </>
          )}

          {lotIdParam && (
            <>
              <span className="small text-muted">Lote:</span>
              <span className="badge bg-info text-dark">{lotIdParam}</span>
            </>
          )}

          {p.create && <Button variant="success" onClick={abrirCrear}>Registrar venta</Button>}
        </div>
      </div>

      <Table hover responsive className="align-middle">
        <thead>
          <tr>
            <ThSort label="ID" field="id" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Lote" field="lotId" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Fecha" field="date" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Estado" field="status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Monto" field="amount" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <th>Inmobiliaria</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).length === 0 ? (
            <tr><td colSpan={7} className="text-center text-muted py-4">No hay ventas para mostrar</td></tr>
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
                  {p.view && <Button size="sm" variant="outline-primary" onClick={() => abrirEditar(v)}>Ver</Button>}
                  {p.edit && <Button size="sm" variant="outline-warning" onClick={() => abrirEditar(v)}>Editar</Button>}
                  {p.del  && <Button size="sm" variant="outline-danger"  onClick={() => eliminar(v)}>Eliminar</Button>}
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

      {/* Modal con errores por campo */}
      <Modal show={modal.show} onHide={cerrarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>{modal.modo === "crear" ? "Registrar venta" : `Editar venta ${modal.datos?.id}`}</Modal.Title>
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
            <Form.Label>Monto</Form.Label>
            <Form.Control
              type="number"
              value={modal.datos?.amount ?? ""}
              isInvalid={!!modalErrors?.amount}
              onChange={onChange("amount")}
              placeholder="Ej: 250000"
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
              value={modal.datos?.status ?? "Registrada"}
              isInvalid={!!modalErrors?.status}
              onChange={onChange("status")}
            >
              <option>Registrada</option>
              <option>Anulada</option>
              <option>Finalizada</option>
            </Form.Select>
            <Form.Control.Feedback type="invalid">{modalErrors?.status}</Form.Control.Feedback>
          </Form.Group>

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
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cerrarModal}>Cancelar</Button>
          <Button variant="primary"  onClick={guardar}>{modal.modo === "crear" ? "Crear" : "Guardar cambios"}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
