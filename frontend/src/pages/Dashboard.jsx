"use client" // habilita hooks en entornos que lo requieran

import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Container, Card, Table, Badge, Button } from "react-bootstrap";
import { useAuth } from "../app/providers/AuthProvider";
import { can, PERMISSIONS } from "../lib/auth/rbac";
import FilterBar from "../components/FilterBar/FilterBar";
import { applyLoteFilters } from "../utils/applyLoteFilters";

// Estilos chiquitos para los puntos de estado y hovers
const css = `
  .brand-gray { background-color: #f0f0f0 !important; }
  .table-row-hover:hover { background-color: rgba(230,239,233,.5) !important; transition: .15s; }
  .status-dot { width:12px; height:12px; border-radius:50%; display:inline-block; margin-right:8px; }
  .status-dot-disponible { background:#28a745; }
  .status-dot-nodisponible { background:#dc3545; }
  .status-dot-vendido { background:#0d6efd; }
  .status-dot-reservado { background:#ffdd00; }
  .status-dot-alquilado { background:#ff8c00; }
  .action-btn { border-radius:8px !important; }
`;

export default function Dashboard() {
  // Traigo del Layout: lista de lotes y handlers de acciones
  const ctx = useOutletContext() || {};
  // 💡 Toma 'allLots' si existe; si no, usa 'lots'. Así no rompemos tu Layout actual.
  const allLots = ctx.allLots || ctx.lots || [];

  const {
    handleViewDetail: _handleViewDetail,
    abrirModalEditar,
    abrirModalEliminar,
    handleDeleteLote,
  } = ctx;

  const navigate = useNavigate();

  // Permisos del usuario para mostrar/ocultar acciones
  const { user } = useAuth();
  const canSaleCreate = can(user, PERMISSIONS.SALE_CREATE);
  const canResCreate  = can(user, PERMISSIONS.RES_CREATE);
  const canLotEdit    = can(user, PERMISSIONS.LOT_EDIT);
  const canLotDelete  = can(user, PERMISSIONS.LOT_DELETE);

  // Pongo color al puntito según estado
  const dotClass = (status) => {
    switch ((status || "").toLowerCase()) {
      case "disponible":    return "status-dot-disponible";
      case "vendido":       return "status-dot-vendido";
      case "no disponible": return "status-dot-nodisponible";
      case "reservado":     return "status-dot-reservado";
      case "alquilado":     return "status-dot-alquilado";
      default:              return "status-dot-nodisponible";
    }
  };

  // Variante del Badge para sub-estado del plano
  const subVariant = (s) => {
    const k = (s || "").toLowerCase();
    if (k.includes("constru")) return "warning";
    if (k.includes("no"))      return "secondary";
    if (k.includes("termin"))  return "success";
    return "light";
  };

  // Navego a Ventas prefiltrando el lotId
  const goRegistrarVenta = (lot) => navigate(`/ventas?lotId=${encodeURIComponent(lot.id)}`);

  // Edito lote (abre el modal del Layout)
  const onEditar = (lot) => abrirModalEditar?.(lot.id);

  // Ver detalle (panel lateral)
  const onVer = (lot) => _handleViewDetail?.(lot.id);

  // Elimino (uso modal si existe; si no, handler directo; si no, aviso)
  const onEliminar = (lot) => {
    if (abrirModalEliminar) return abrirModalEliminar(lot.id);
    if (handleDeleteLote)   return handleDeleteLote(lot.id);
    alert("Eliminar no disponible en esta vista.");
  };

  const [params, setParams] = useState({});
  const lots = useMemo(() => applyLoteFilters(allLots, params), [allLots, params]);

  return (
    <>
      <style>{css}</style>

      {/* FilterBar */}
      <FilterBar topOffset={64} onParamsChange={setParams} />

      <Container className="py-4">
        {/* Contador simple para feedback */}
        <div className="text-muted mb-2">
          Mostrando {lots.length} de {allLots.length} lotes
        </div>

        <Card style={{ borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
          <Card.Body className="p-0">
            <Table hover responsive className="mb-0">
              <thead className="brand-gray">
                <tr>
                  <th width="50" className="p-3"></th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Estado-Plano</th>
                  <th className="p-3">Propietario</th>
                  <th className="p-3">Ubicación</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(lots || []).map((lot) => (
                  <tr key={lot.id} className="table-row-hover">
                    {/* Puntito de estado */}
                    <td className="p-3">
                      <span className={`status-dot ${dotClass(lot.status)}`} />
                    </td>

                    {/* ID */}
                    <td className="p-3">
                      <Badge bg="light" text="dark" className="px-3 py-2" style={{ borderRadius: 12 }}>
                        {lot.id}
                      </Badge>
                    </td>

                    {/* Estado */}
                    <td className="p-3">
                      <Badge bg="light" text="dark" className="px-3 py-2" style={{ borderRadius: 12 }}>
                        {lot.status || "-"}
                      </Badge>
                    </td>

                    {/* Estado de plano */}
                    <td className="p-3">
                      <Badge bg={subVariant(lot.subStatus)} className="px-3 py-2" style={{ borderRadius: 12 }}>
                        {lot.subStatus || "-"}
                      </Badge>
                    </td>

                    {/* Propietario */}
                    <td className="p-3">
                      <Badge bg="outline" className="px-3 py-2 border" style={{ borderRadius: 12 }}>
                        {lot.owner || "CCLF"}
                      </Badge>
                    </td>

                    {/* Ubicación */}
                    <td className="p-3">
                      <small className="text-muted">{lot.location || "-"}</small>
                    </td>

                    {/* Acciones */}
                    <td className="p-3">
                      <div className="d-flex flex-wrap gap-1">
                        {canSaleCreate && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="action-btn"
                            onClick={() => goRegistrarVenta(lot)}
                          >
                            Registrar venta
                          </Button>
                        )}

                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="action-btn"
                          onClick={() => onVer(lot)}
                        >
                          Ver
                        </Button>

                        {canLotEdit && (
                          <Button
                            variant="outline-warning"
                            size="sm"
                            className="action-btn"
                            onClick={() => onEditar(lot)}
                          >
                            Editar
                          </Button>
                        )}

                        {canLotDelete && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="action-btn"
                            onClick={() => onEliminar(lot)}
                          >
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* Mensaje vacío */}
            {(lots || []).length === 0 && (
              <div className="text-center py-5">
                <i className="bi bi-info-circle text-muted" style={{ fontSize: "2rem" }} />
                <p className="text-muted mt-3 mb-0">
                  No se encontraron lotes con los filtros aplicados.
                </p>
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}
