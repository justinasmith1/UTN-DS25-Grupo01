// Página de Ventas: lista + crear/editar/eliminar. Respeta permisos del rol.
// Mantengo los campos simples: lotId, monto, observaciones, status, inmobiliariaId.

import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Spinner, Badge, Pagination } from "react-bootstrap";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import { useToast } from "../app/providers/ToastProvider";
import { useSearchParams, useNavigate } from "react-router-dom";
import { parseApiError } from "../lib/http/errors";

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
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0); // dejo el total para paginación

  // Querystring (estado de la vista en la URL)
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filtros cruzados desde otras pantallas
  const filtroInmoId = searchParams.get("inmobiliariaId");
  const lotIdParam   = searchParams.get("lotId");

  // Mis parámetros de vista (persisten en la URL)
  const q        = searchParams.get("q") || "";
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));
  const sortBy   = searchParams.get("sortBy")  || "date";           // id | date | amount | lotId
  const sortDir  = (searchParams.get("sortDir") || "desc").toLowerCase(); // asc | desc

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

  // Helper chico para actualizar la URL sin perder otros params
  const setQS = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next);
  };

  // Cargo lista: uso querystring (q, sort, paginado) + filtros cruzados
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        const params = { q, page, pageSize, sortBy, sortDir };
        if (filtroInmoId) params.inmobiliariaId = Number(filtroInmoId) || filtroInmoId;
        if (lotIdParam)   params.lotId = lotIdParam;

        const res = await getAllVentas(params);
        if (alive) {
          setItems(res.data || []);
          setTotal(res.meta?.total ?? (res.data?.length ?? 0));
        }
      } catch (e) {
        console.error(e);
        error(parseApiError(e, "No pude cargar las ventas"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // recargo cuando cambie cualquiera de los parámetros que afectan la lista
  }, [q, page, pageSize, sortBy, sortDir, filtroInmoId, lotIdParam]);

  // abrir modal crear (prelleno con lotId/inmobiliariaId si vienen por query)
  const abrirCrear = () =>
    setModal({
      show: true,
      modo: "crear",
      datos: {
        lotId: lotIdParam || "",
        amount: "",
        observaciones: "",
        status: "Registrada",
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
        setTotal((t) => t + 1); // actualizo total local al crear
        success("Venta registrada");
      } else {
        const res = await updateVenta(modal.datos.id, payload);
        setItems((prev) => prev.map((it) => (it.id === modal.datos.id ? res.data : it)));
        success("Venta actualizada");
      }
      cerrarModal();
    } catch (e) {
      console.error(e);
      error(parseApiError(e, "No pude guardar la venta"));
    }
  };

  // eliminar
  const eliminar = async (v) => {
    if (!window.confirm(`Eliminar la venta ${v.id}?`)) return;
    try {
      await deleteVenta(v.id);
      setItems((prev) => prev.filter((it) => it.id !== v.id));
      setTotal((t) => Math.max(0, t - 1)); // bajo el total local
      success("Venta eliminada");
    } catch (e) {
      console.error(e);
      error(parseApiError(e, "No pude eliminar la venta"));
    }
  };

  // handlers de búsqueda/orden/paginado (dejo simples y claros)
  const onSearchChange = (e) => setQS({ q: e.target.value, page: 1 });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setQS({ sortDir: sortDir === "asc" ? "desc" : "asc", page: 1 });
    } else {
      setQS({ sortBy: field, sortDir: "asc", page: 1 });
    }
  };

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
          {/* Buscador básico que persiste en la URL (q=) */}
          <Form.Control
            size="sm"
            type="search"
            placeholder="Buscar por ID, lote u observaciones…"
            value={q}
            onChange={onSearchChange}
            style={{ minWidth: 260 }}
          />

          {/* Si estoy filtrando por inmobiliaria, lo muestro y doy opción de limpiar */}
          {filtroInmoId && (
            <>
              <span className="small text-muted">Inmobiliaria:</span>
              <span className="badge bg-info text-dark">{filtroInmoId}</span>
              <Button size="sm" variant="outline-secondary" onClick={() => navigate("/ventas")}>
                Quitar filtro
              </Button>
            </>
          )}

          {/* chip de filtro por Lote */}
          {lotIdParam && (
            <>
              <span className="small text-muted">Lote:</span>
              <span className="badge bg-info text-dark">{lotIdParam}</span>
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
            <ThSort label="ID"      field="id"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Lote"    field="lotId"   sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Fecha"   field="date"    sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Estado"  field="status"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            <ThSort label="Monto"   field="amount"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
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

      {/* Controles de paginado y tamaño de página */}
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

// Encabezado ordenable reutilizable (click para alternar asc/desc).
// Lo dejo acá para no crear archivo extra.
function ThSort({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field;
  const arrow = !active ? "" : sortDir === "asc" ? " ▲" : " ▼";
  return (
    <th role="button" onClick={() => onSort(field)} className="user-select-none">
      {label}{arrow}
    </th>
  );
}
