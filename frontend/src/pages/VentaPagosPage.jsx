// src/pages/VentaPagosPage.jsx
// Pagos por venta: contexto, plan vigente, cronograma, registro de pagos.

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getPagosContextByVentaId } from "../lib/api/pagos";
import { fmtFecha } from "../components/Table/TablaVentas/utils/formatters";
import PlanCrearForm from "../components/Pagos/PlanCrearForm";
import PagoRegistrarCard from "../components/Pagos/PagoRegistrarCard";
import SuccessAnimation from "../components/Cards/Base/SuccessAnimation.jsx";
import Can from "../components/Can";
import { PERMISSIONS } from "../lib/auth/rbac";
import { fmtMonto, fmtMontoSinMoneda } from "../utils/pagoUtils";
import "../styles/venta-pagos.css";

const SUCCESS_ANIM_MS = 1500;
const MSG_PLAN_CREADO = "¡Plan de pago creado exitosamente!";
const MSG_PAGO_REGISTRADO = "¡Pago registrado exitosamente!";

// Comprador: nombre + apellido o razón social
const getCompradorLabel = (comprador) => {
  if (!comprador) return "—";
  const rs = comprador.razonSocial?.trim();
  if (rs) return rs;
  const n = comprador.nombre?.trim() ?? "";
  const a = comprador.apellido?.trim() ?? "";
  return [n, a].filter(Boolean).join(" ").trim() || "—";
};

// Lote: numero o id
const getLoteLabel = (lote) => {
  if (!lote) return "—";
  if (lote.numero != null) return String(lote.numero);
  if (lote.fraccion?.numero != null) return `Fracc. ${lote.fraccion.numero}`;
  if (lote.id != null) return `Lote #${lote.id}`;
  return "—";
};

// Badge para estado de venta / estado de cobro
const getEstadoBadgeClass = (estado) => {
  const s = String(estado || "").toUpperCase();
  if (s === "PAGO_COMPLETO" || s === "ESCRITURADO") return "vp-badge--success";
  if (s === "EN_CURSO" || s === "CON_BOLETO") return "vp-badge--warn";
  if (s === "PENDIENTE" || s === "INICIADA") return "vp-badge--muted";
  if (s === "CANCELADA") return "vp-badge--danger";
  return "vp-badge--muted";
};

// Badge para estado de cuota (PENDIENTE, PAGO_PARCIAL, PAGA)
const getCuotaBadgeClass = (estado) => {
  const s = String(estado || "").toUpperCase();
  if (s === "PAGA") return "vp-badge--PAGA";
  if (s === "PAGO_PARCIAL") return "vp-badge--PAGO_PARCIAL";
  return "vp-badge--PENDIENTE";
};

export default function VentaPagosPage() {
  const { ventaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [showFormPlan, setShowFormPlan] = useState(false);
  const [showFormPago, setShowFormPago] = useState(false);
  const [successAnimMessage, setSuccessAnimMessage] = useState(null);
  const [contextRefreshWarning, setContextRefreshWarning] = useState(null);
  const successAnimTimerRef = useRef(null);

  const fetchContext = useCallback(async (options = {}) => {
    const { showLoading = true } = options;
    const id = parseInt(ventaId, 10);
    if (isNaN(id)) {
      setError("ID de venta inválido");
      if (showLoading) setLoading(false);
      return { ok: false };
    }
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await getPagosContextByVentaId(id);
      setData(result);
      setContextRefreshWarning(null);
      return { ok: true };
    } catch (err) {
      if (showLoading) {
        setError(err?.message || "Error al cargar el contexto de pagos");
      } else {
        console.error("Error al actualizar el contexto de pagos:", err);
      }
      return { ok: false };
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [ventaId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  useEffect(() => {
    return () => {
      if (successAnimTimerRef.current) clearTimeout(successAnimTimerRef.current);
    };
  }, []);

  const showSuccessThenRefresh = useCallback(async (message) => {
    if (successAnimTimerRef.current) clearTimeout(successAnimTimerRef.current);
    setSuccessAnimMessage(message);
    successAnimTimerRef.current = setTimeout(() => {
      setSuccessAnimMessage(null);
      successAnimTimerRef.current = null;
    }, SUCCESS_ANIM_MS);
    const { ok } = await fetchContext({ showLoading: false });
    if (!ok) setContextRefreshWarning(MSG_REFRESH_FALLIDO);
  }, [fetchContext]);

  const handlePlanCreado = useCallback(() => {
    setShowFormPlan(false);
    showSuccessThenRefresh(MSG_PLAN_CREADO);
  }, [showSuccessThenRefresh]);

  const handlePagoRegistrado = useCallback(() => {
    setShowFormPago(false);
    showSuccessThenRefresh(MSG_PAGO_REGISTRADO);
  }, [showSuccessThenRefresh]);

  const moneda = data?.planVigente?.moneda ?? "ARS";
  const cuotaById = useMemo(() => {
    const map = {};
    (data?.cuotas ?? []).forEach((c) => {
      if (c?.id != null) map[String(c.id)] = c;
    });
    return map;
  }, [data?.cuotas]);

  // Cuota habilitada: primera del plan vigente con saldoPendiente > 0, ordenada por numeroCuota ASC
  const cuotaHabilitada = useMemo(() => {
    const list = (data?.cuotas ?? []).filter((c) => Number(c.saldoPendiente) > 0);
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => (a.numeroCuota ?? 0) - (b.numeroCuota ?? 0));
    return sorted[0] ?? null;
  }, [data?.cuotas]);

  const volverAVentas = () => navigate("/ventas");
  const botonVolver = (
    <button type="button" className="vp-btn-volver" onClick={volverAVentas}>
      <ArrowLeft size={18} />
      Volver a ventas
    </button>
  );

  if (loading) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "40vh" }}>
          <div className="spinner-border text-primary" role="status" />
          <span className="ms-2 text-muted">Cargando pagos…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger mb-3">{error}</div>
        {botonVolver}
      </div>
    );
  }

  const { venta, planVigente, cuotas = [], pagos = [], resumen = {} } = data ?? {};
  const totalCuotas = resumen.cantidadCuotas ?? 0;

  return (
    <div className="container py-4">
      <SuccessAnimation show={Boolean(successAnimMessage)} message={successAnimMessage ?? ""} />

      {contextRefreshWarning ? (
        <div
          className="alert alert-warning alert-dismissible vp-refresh-warning mb-3"
          role="alert"
        >
          {contextRefreshWarning}
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={() => setContextRefreshWarning(null)}
          />
        </div>
      ) : null}

      {/* A. Encabezado / contexto de venta */}
      <div className="vp-header d-flex justify-content-between align-items-start flex-wrap gap-3">
        <div>
          <h1 className="vp-title">Pagos — Venta {venta?.numero ?? ventaId}</h1>
          <div className="vp-context">
            <span className="vp-context-item">
              <span className="vp-context-label">Fecha:</span> {fmtFecha(venta?.fechaVenta)}
            </span>
            <span
              className="vp-context-item"
              title={
                planVigente
                  ? undefined
                  : "Monto de la venta; la moneda de cobro queda definida al crear el plan de pago."
              }
            >
              <span className="vp-context-label">Monto venta:</span>{" "}
              {planVigente ? fmtMonto(venta?.monto, planVigente.moneda) : fmtMontoSinMoneda(venta?.monto)}
            </span>
            <span className="vp-context-item">
              <span className={`vp-badge ${getEstadoBadgeClass(venta?.estado)}`}>
                {venta?.estado ?? "—"}
              </span>
            </span>
            <span className="vp-context-item">
              <span className={`vp-badge ${getEstadoBadgeClass(venta?.estadoCobro)}`}>
                Cobro: {venta?.estadoCobro ?? "—"}
              </span>
            </span>
            <span className="vp-context-item">
              <span className="vp-context-label">Lote:</span> {getLoteLabel(venta?.lote)}
            </span>
            <span className="vp-context-item">
              <span className="vp-context-label">Comprador:</span> {getCompradorLabel(venta?.comprador)}
            </span>
          </div>
        </div>
        {botonVolver}
      </div>

      {/* B. Resumen financiero */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="vp-summary-card vp-summary-card--highlight">
            <div className="vp-summary-label">Monto planificado</div>
            <div className="vp-summary-value">{fmtMonto(resumen.montoTotalPlanificado, moneda)}</div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="vp-summary-card vp-summary-card--highlight">
            <div className="vp-summary-label">Monto pagado</div>
            <div className="vp-summary-value vp-summary-value--success">{fmtMonto(resumen.montoTotalPagado, moneda)}</div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="vp-summary-card vp-summary-card--highlight">
            <div className="vp-summary-label">Saldo pendiente</div>
            <div className="vp-summary-value vp-summary-value--warn">{fmtMonto(resumen.saldoPendienteTotal, moneda)}</div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="vp-summary-card">
            <div className="vp-summary-label">Cuotas</div>
            <div className="vp-summary-value">
              {resumen.cuotasPagas ?? 0} pagas / {totalCuotas} total
              {(resumen.cuotasVencidas ?? 0) > 0 && (
                <span className="vp-badge vp-badge--danger ms-2">{resumen.cuotasVencidas} vencidas</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* C. Plan vigente o formulario de creación */}
      {planVigente ? (
        <div className="vp-summary-card mb-4">
          <h5 className="vp-section-title mb-3">Plan vigente</h5>
          <div className="vp-plan-grid">
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Nombre</div>
              <div className="vp-plan-field__value">{planVigente.nombre}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Tipo financiación</div>
              <div className="vp-plan-field__value">{planVigente.tipoFinanciacion ?? "—"}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Moneda</div>
              <div className="vp-plan-field__value">{planVigente.moneda ?? "—"}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Cantidad de cuotas</div>
              <div className="vp-plan-field__value">{planVigente.cantidadCuotas ?? "—"}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Anticipo</div>
              <div className="vp-plan-field__value">{fmtMonto(planVigente.montoAnticipo, moneda)}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Monto financiado</div>
              <div className="vp-plan-field__value">{fmtMonto(planVigente.montoFinanciado, moneda)}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Fecha inicio</div>
              <div className="vp-plan-field__value">{fmtFecha(planVigente.fechaInicio)}</div>
            </div>
            {planVigente.observaciones && (
              <div className="vp-plan-field" style={{ gridColumn: "1 / -1" }}>
                <div className="vp-plan-field__label">Observaciones</div>
                <div className="vp-plan-field__value">{planVigente.observaciones}</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="vp-summary-card vp-plan-empty-card mb-4">
          <div className="vp-plan-empty-header">
            <h5 className="vp-section-title mb-0">Plan vigente</h5>
            <Can permission={PERMISSIONS.SALE_EDIT}>
              <button
                type="button"
                className="vp-btn-crear-plan"
                onClick={() => setShowFormPlan(true)}
              >
                Crear plan
              </button>
            </Can>
          </div>
          <div className="vp-empty vp-empty--plan">Esta venta no tiene plan de pago definido.</div>
        </div>
      )}

      {/* D. Cronograma de cuotas */}
      <div className="vp-summary-card mb-4">
        <div className="vp-cronograma-header mb-3">
          <h5 className="vp-section-title mb-0">Cronograma de cuotas</h5>
          {planVigente &&
            (cuotaHabilitada ? (
              <div className="vp-cronograma-cta">
                <div className="vp-cronograma-cta__context">
                  <span className="vp-cronograma-cta__label">Cuota habilitada para cobro</span>
                  <span className="vp-cronograma-cta__meta">
                    #{cuotaHabilitada.numeroCuota}
                    <span className="vp-cronograma-cta__sep">·</span>
                    {cuotaHabilitada.tipoCuota ?? "—"}
                    <span className="vp-cronograma-cta__sep">·</span>
                    {moneda}
                  </span>
                </div>
                <Can permission={PERMISSIONS.SALE_EDIT}>
                  <button
                    type="button"
                    className="vp-btn-crear-plan vp-btn-registrar-pago"
                    onClick={() => setShowFormPago(true)}
                  >
                    Registrar pago
                  </button>
                </Can>
              </div>
            ) : (
              <span className="vp-no-cuotas-msg text-muted">No hay cuotas pendientes para registrar pago</span>
            ))}
        </div>
        {cuotas.length > 0 ? (
          <div className="vp-table-wrap">
            <table className="vp-table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Tipo</th>
                  <th>Vencimiento</th>
                  <th className="vp-th-num">Monto exigible</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cuotas.map((c) => {
                  const vencida = Boolean(c.estaVencida);
                  const habilitada = cuotaHabilitada && c.id === cuotaHabilitada.id;
                  const rowClass = [
                    vencida ? "vp-row--vencida" : "",
                    habilitada ? "vp-row--habilitada" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={c.id} className={rowClass || undefined}>
                      <td>{c.numeroCuota}</td>
                      <td>{c.tipoCuota ?? "—"}</td>
                      <td>{fmtFecha(c.fechaVencimiento)}</td>
                      <td className="vp-cell-num">{fmtMonto(c.montoTotalExigible ?? c.montoOriginal, moneda)}</td>
                      <td className="vp-cell-saldo">{fmtMonto(c.montoPagado, moneda)}</td>
                      <td className="vp-cell-saldo">{fmtMonto(c.saldoPendiente, moneda)}</td>
                      <td>
                        {vencida ? (
                          <span className="vp-badge-cuota vp-badge--vencida">Vencida</span>
                        ) : (
                          <span className={`vp-badge-cuota ${getCuotaBadgeClass(c.estadoCuota)}`}>
                            {c.estadoCuota ?? "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="vp-empty">No hay cuotas para mostrar.</div>
        )}
      </div>

      {/* E. Historial de pagos */}
      <div className="vp-summary-card">
        <h5 className="vp-section-title mb-3">Historial de pagos</h5>
        {pagos.length > 0 ? (
          <div className="vp-table-wrap">
            <table className="vp-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="vp-th-num">Monto</th>
                  <th>Medio</th>
                  <th>Cuota</th>
                  <th>Referencia</th>
                  <th>Observación</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => {
                  const cuota = cuotaById[String(p.cuotaId)];
                  const cuotaLabel = cuota ? `Cuota ${cuota.numeroCuota}` : "—";
                  return (
                    <tr key={p.id}>
                      <td>{fmtFecha(p.fechaPago)}</td>
                      <td className="vp-cell-num">{fmtMonto(p.monto, moneda)}</td>
                      <td>{p.medioPago ?? "—"}</td>
                      <td>{cuotaLabel}</td>
                      <td>{p.referencia ?? "—"}</td>
                      <td>{p.observacion ?? "—"}</td>
                      <td>{p.registradoBy ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="vp-empty">No hay pagos registrados.</div>
        )}
      </div>

      {/* Modal flotante: Crear plan de pago */}
      {!planVigente && (
        <PlanCrearForm
          open={showFormPlan}
          ventaId={parseInt(ventaId, 10)}
          onSuccess={handlePlanCreado}
          onCancel={() => setShowFormPlan(false)}
        />
      )}

      {/* Modal flotante: Registrar pago */}
      {planVigente && cuotaHabilitada && (
        <PagoRegistrarCard
          open={showFormPago}
          ventaId={parseInt(ventaId, 10)}
          cuotaHabilitada={cuotaHabilitada}
          moneda={moneda}
          onSuccess={handlePagoRegistrado}
          onCancel={() => setShowFormPago(false)}
        />
      )}
    </div>
  );
}
