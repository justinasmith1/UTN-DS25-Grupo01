// src/pages/VentaPagosPage.jsx
// Pagos por venta: contexto, plan vigente, cronograma, registro de pagos.

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, CalendarRange, History } from "lucide-react";
import { getPagosContextByVentaId } from "../lib/api/pagos";
import { fmtFecha } from "../components/Table/TablaVentas/utils/formatters";
import { getLoteIdFormatted } from "../components/Table/TablaLotes/utils/getters";
import PlanCrearForm from "../components/Pagos/PlanCrearForm";
import PagoRegistrarCard from "../components/Pagos/PagoRegistrarCard";
import RecargoAplicarCard from "../components/Pagos/RecargoAplicarCard";
import SuccessAnimation from "../components/Cards/Base/SuccessAnimation.jsx";
import Can from "../components/Can";
import { PERMISSIONS } from "../lib/auth/rbac";
import { fmtMonto, fmtMontoSinMoneda } from "../utils/pagoUtils";
import NiceSelect from "../components/Base/NiceSelect";
import "../components/Cards/Base/cards.css";
import "../styles/venta-pagos.css";

const SUCCESS_ANIM_MS = 1500;
const MSG_PLAN_CREADO = "¡Plan de pago creado exitosamente!";
const MSG_PAGO_REGISTRADO = "¡Pago registrado exitosamente!";
const MSG_RECARGO_APLICADO = "¡Recargo aplicado exitosamente!";
const MSG_PLAN_REEMPLAZADO = "¡Plan de pago reemplazado exitosamente!";
const MSG_REFRESH_FALLIDO =
  "La operación se completó pero no se pudo actualizar la vista. Actualizá la página para ver los datos al día.";

// Comprador: nombre + apellido o razón social
const getCompradorLabel = (comprador) => {
  if (!comprador) return "—";
  const rs = comprador.razonSocial?.trim();
  if (rs) return rs;
  const n = comprador.nombre?.trim() ?? "";
  const a = comprador.apellido?.trim() ?? "";
  return [n, a].filter(Boolean).join(" ").trim() || "—";
};

/** Lista legible de compradores (compradores[] + fallback comprador principal). */
const formatCompradoresVenta = (venta) => {
  if (!venta) return "—";
  const multi = Array.isArray(venta.compradores) ? venta.compradores : [];
  const list =
    multi.length > 0 ? multi : venta.comprador ? [venta.comprador] : [];
  const labels = list.map(getCompradorLabel).filter((s) => s && s !== "—");
  if (!labels.length) return "—";
  return labels.join(", ");
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
  const [showRecargoModal, setShowRecargoModal] = useState(false);
  const [showReemplazoModal, setShowReemplazoModal] = useState(false);
  const [cuotaRecargoSeleccionada, setCuotaRecargoSeleccionada] = useState(null);
  const [successAnimMessage, setSuccessAnimMessage] = useState(null);
  const [contextRefreshWarning, setContextRefreshWarning] = useState(null);
  const successAnimTimerRef = useRef(null);
  /** Id del plan cuyo detalle y cronograma se muestran; al cargar / tras reemplazo se sincroniza con el vigente. */
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const prevVigentePlanIdRef = useRef(null);

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
    prevVigentePlanIdRef.current = null;
  }, [ventaId]);

  useEffect(() => {
    const vid = data?.planVigente?.id;
    if (vid == null) return;
    if (prevVigentePlanIdRef.current === null) {
      setSelectedPlanId(vid);
      prevVigentePlanIdRef.current = vid;
      return;
    }
    if (prevVigentePlanIdRef.current !== vid) {
      setSelectedPlanId(vid);
      prevVigentePlanIdRef.current = vid;
    }
  }, [data?.planVigente?.id]);

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

  const handleRecargoAplicado = useCallback(() => {
    setShowRecargoModal(false);
    setCuotaRecargoSeleccionada(null);
    showSuccessThenRefresh(MSG_RECARGO_APLICADO);
  }, [showSuccessThenRefresh]);

  const handlePlanReemplazado = useCallback(() => {
    setShowReemplazoModal(false);
    showSuccessThenRefresh(MSG_PLAN_REEMPLAZADO);
  }, [showSuccessThenRefresh]);

  const planVista = useMemo(() => {
    const pv = data?.planVigente;
    if (!pv) {
      return { plan: null, cuotas: [], esHistorico: false };
    }
    const hist = data?.planesHistoricos ?? [];
    const effectiveId = selectedPlanId ?? pv.id;
    if (Number(effectiveId) === Number(pv.id)) {
      return { plan: pv, cuotas: data?.cuotas ?? [], esHistorico: false };
    }
    const h = hist.find((p) => Number(p.id) === Number(effectiveId));
    if (h) {
      return { plan: h, cuotas: h.cuotas ?? [], esHistorico: true };
    }
    return { plan: pv, cuotas: data?.cuotas ?? [], esHistorico: false };
  }, [data, selectedPlanId]);

  const versionOptions = useMemo(() => {
    const pv = data?.planVigente;
    if (!pv) return [];
    const hist = [...(data?.planesHistoricos ?? [])].sort(
      (a, b) => (b.version ?? 0) - (a.version ?? 0)
    );
    return [
      { id: pv.id, label: `Vigente (v${pv.version})` },
      ...hist.map((p) => ({ id: p.id, label: `v${p.version}` })),
    ];
  }, [data?.planVigente, data?.planesHistoricos]);

  const versionNiceSelectOptions = useMemo(
    () => versionOptions.map((o) => ({ value: o.id, label: o.label })),
    [versionOptions]
  );

  const moneda = data?.planVigente?.moneda ?? "ARS";
  const monedaVistaPlan = planVista.plan?.moneda ?? moneda;

  // Cuota habilitada: primera del plan vigente con saldoPendiente > 0, ordenada por numeroCuota ASC
  const cuotaHabilitada = useMemo(() => {
    const list = (data?.cuotas ?? []).filter((c) => Number(c.saldoPendiente) > 0);
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => (a.numeroCuota ?? 0) - (b.numeroCuota ?? 0));
    return sorted[0] ?? null;
  }, [data?.cuotas]);

  const modoConsultaCancelada = useMemo(
    () => String(data?.venta?.estado ?? "").toUpperCase() === "CANCELADA",
    [data?.venta?.estado]
  );

  /** Monto planificado = pagado + saldo (coherente con recargos y reemplazos). */
  const resumenCoherente = useMemo(() => {
    const r = data?.resumen ?? {};
    const p = Number(r.montoTotalPagado);
    const s = Number(r.saldoPendienteTotal);
    const pagado = Number.isFinite(p) ? p : 0;
    const saldo = Number.isFinite(s) ? s : 0;
    return {
      ...r,
      montoPlanificado: Math.round((pagado + saldo) * 100) / 100,
    };
  }, [
    data?.resumen?.montoTotalPagado,
    data?.resumen?.saldoPendienteTotal,
    data?.resumen?.cantidadCuotas,
    data?.resumen?.cuotasPagas,
    data?.resumen?.cuotasVencidas,
    data?.resumen?.montoTotalPlanificado,
  ]);

  const puedeMostrarReemplazoPlan = useMemo(() => {
    if (modoConsultaCancelada) return false;
    if (planVista.esHistorico) return false;
    const pv = data?.planVigente;
    if (!pv?.id) return false;
    const listPagos = data?.pagos ?? [];
    const tienePagosEnPlanVigente = listPagos.some(
      (p) => Number(p.planPagoId) === Number(pv.id)
    );
    const saldo = Number(data?.resumen?.saldoPendienteTotal);
    return tienePagosEnPlanVigente && !Number.isNaN(saldo) && saldo > 0;
  }, [data, planVista.esHistorico, modoConsultaCancelada]);

  const puedeAplicarRecargoCuota = (c) =>
    Boolean(c?.estaVencida) && Number(c?.saldoPendiente) > 0;

  const mostrarAccionesCronograma =
    Boolean(data?.planVigente) && !planVista.esHistorico && !modoConsultaCancelada;
  const planVersionNiceSelectValue = selectedPlanId ?? data?.planVigente?.id ?? "";

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

  const { venta, planVigente, pagos = [] } = data ?? {};
  const totalCuotas = resumenCoherente.cantidadCuotas ?? 0;
  const cuotasVencidas = resumenCoherente.cuotasVencidas ?? 0;
  const loteDisplay = getLoteIdFormatted(venta?.lote);

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
        <div className="vp-header__main flex-grow-1 min-w-0">
          <h1 className="vp-title">Pagos — Venta {venta?.numero ?? ventaId}</h1>
          <div className="vp-header__secondary">
            <div className="vp-header__badges" role="group" aria-label="Estados">
              <span className={`vp-badge ${getEstadoBadgeClass(venta?.estado)}`}>
                {venta?.estado ?? "—"}
              </span>
              <span className={`vp-badge ${getEstadoBadgeClass(venta?.estadoCobro)}`}>
                Cobro: {venta?.estadoCobro ?? "—"}
              </span>
            </div>
            {modoConsultaCancelada ? (
              <p className="vp-header__consulta-hint">
                Venta cancelada — solo consulta (sin crear plan, registrar pagos ni aplicar recargos).
              </p>
            ) : null}
            <div className="vp-header__meta vp-context">
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
                <span className="vp-context-label">Lote:</span> {loteDisplay}
              </span>
              <span className="vp-context-item vp-context-item--block-sm">
                <span className="vp-context-label">
                  Comprador{Array.isArray(venta?.compradores) && venta.compradores.length > 1 ? "es" : ""}:
                </span>{" "}
                {formatCompradoresVenta(venta)}
              </span>
            </div>
          </div>
        </div>
        {botonVolver}
      </div>

      {/* B. Resumen financiero (global operativo; cuotas del plan vigente) */}
      <div className="row g-3 mb-4 vp-summary-row">
        <div className="col-6 col-md-4 col-xl-2">
          <div className="vp-summary-card vp-summary-card--highlight">
            <div className="vp-summary-label">Monto planificado</div>
            <div className="vp-summary-value">
              {fmtMonto(resumenCoherente.montoPlanificado, moneda)}
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <div className="vp-summary-card vp-summary-card--highlight">
            <div className="vp-summary-label">Monto pagado</div>
            <div className="vp-summary-value vp-summary-value--success">
              {fmtMonto(resumenCoherente.montoTotalPagado, moneda)}
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <div className="vp-summary-card vp-summary-card--highlight">
            <div className="vp-summary-label">Saldo pendiente</div>
            <div className="vp-summary-value vp-summary-value--warn">
              {fmtMonto(resumenCoherente.saldoPendienteTotal, moneda)}
            </div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <div className="vp-summary-card">
            <div className="vp-summary-label">Cuotas pagas</div>
            <div className="vp-summary-value">{resumenCoherente.cuotasPagas ?? 0}</div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <div className="vp-summary-card">
            <div className="vp-summary-label">Cuotas totales</div>
            <div className="vp-summary-value">{totalCuotas}</div>
          </div>
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <div
            className={`vp-summary-card${cuotasVencidas > 0 ? " vp-summary-card--vencidas-alert" : ""}`}
          >
            <div className="vp-summary-label">Cuotas vencidas</div>
            <div
              className={`vp-summary-value${cuotasVencidas > 0 ? " vp-summary-value--danger-soft" : ""}`}
            >
              {cuotasVencidas}
            </div>
          </div>
        </div>
      </div>

      {/* C. Plan de pago (visor por versión) o formulario de creación */}
      {planVigente ? (
        <div
          className={`vp-summary-card vp-section-block mb-4${planVista.esHistorico ? " vp-summary-card--historico" : ""}`}
        >
          <div className="vp-plan-vigente-header">
            <h5 className="vp-section-title vp-section-title--with-icon mb-0">
              <Wallet className="vp-section-title__icon" size={18} strokeWidth={2} aria-hidden />
              Plan de pago
            </h5>
            <div className="vp-plan-header-actions">
              {versionOptions.length > 1 ? (
                <div
                  className="vp-plan-version-ns"
                  role="group"
                  aria-label="Versión del plan de pago"
                >
                  <NiceSelect
                    value={planVersionNiceSelectValue}
                    options={versionNiceSelectOptions}
                    placeholder="Versión"
                    onChange={(v) => {
                      const n = Number(v);
                      if (!Number.isNaN(n)) setSelectedPlanId(n);
                    }}
                  />
                </div>
              ) : null}
              {puedeMostrarReemplazoPlan ? (
                <Can permission={PERMISSIONS.SALE_EDIT}>
                  <button
                    type="button"
                    className="vp-btn-crear-plan"
                    onClick={() => setShowReemplazoModal(true)}
                  >
                    Reemplazar plan
                  </button>
                </Can>
              ) : null}
            </div>
          </div>
          <div className="vp-plan-grid">
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Nombre</div>
              <div className="vp-plan-field__value">{planVista.plan?.nombre ?? "—"}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Tipo financiación</div>
              <div className="vp-plan-field__value">{planVista.plan?.tipoFinanciacion ?? "—"}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Moneda</div>
              <div className="vp-plan-field__value">{planVista.plan?.moneda ?? "—"}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Cantidad de cuotas</div>
              <div className="vp-plan-field__value">{planVista.plan?.cantidadCuotas ?? "—"}</div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Anticipo</div>
              <div className="vp-plan-field__value">
                {fmtMonto(planVista.plan?.montoAnticipo, monedaVistaPlan)}
              </div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Monto financiado</div>
              <div className="vp-plan-field__value">
                {fmtMonto(planVista.plan?.montoFinanciado, monedaVistaPlan)}
              </div>
            </div>
            <div className="vp-plan-field">
              <div className="vp-plan-field__label">Fecha inicio</div>
              <div className="vp-plan-field__value">{fmtFecha(planVista.plan?.fechaInicio)}</div>
            </div>
            {planVista.plan?.descripcion ? (
              <div className="vp-plan-field" style={{ gridColumn: "1 / -1" }}>
                <div className="vp-plan-field__label">Descripción</div>
                <div className="vp-plan-field__value">{planVista.plan.descripcion}</div>
              </div>
            ) : null}
            {planVista.plan?.observaciones ? (
              <div className="vp-plan-field" style={{ gridColumn: "1 / -1" }}>
                <div className="vp-plan-field__label">Observaciones</div>
                <div className="vp-plan-field__value">{planVista.plan.observaciones}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="vp-summary-card vp-plan-empty-card mb-4">
          <div className="vp-plan-empty-header">
            <h5 className="vp-section-title mb-0">Plan vigente</h5>
            {!modoConsultaCancelada ? (
              <Can permission={PERMISSIONS.SALE_EDIT}>
                <button
                  type="button"
                  className="vp-btn-crear-plan"
                  onClick={() => setShowFormPlan(true)}
                >
                  Crear plan
                </button>
              </Can>
            ) : null}
          </div>
          <div className="vp-empty vp-empty--plan">Esta venta no tiene plan de pago definido.</div>
        </div>
      )}

      {/* D. Cronograma de cuotas (según versión seleccionada) */}
      <div
        className={`vp-summary-card vp-section-block mb-4${planVista.esHistorico ? " vp-summary-card--historico" : ""}`}
      >
        <div className="vp-cronograma-header mb-3">
          <div className="vp-section-head">
            <h5 className="vp-section-title vp-section-title--with-icon mb-0">
              <CalendarRange className="vp-section-title__icon" size={18} strokeWidth={2} aria-hidden />
              Cronograma de cuotas
            </h5>
            {planVigente && planVista.esHistorico ? (
              <p className="vp-cronograma-hint text-muted small mb-0">
                Vista de consulta — versión reemplazada (sin acciones de cobro).
              </p>
            ) : null}
            {planVigente && modoConsultaCancelada && !planVista.esHistorico ? (
              <p className="vp-cronograma-hint text-muted small mb-0">
                Venta cancelada — solo consulta (sin registrar pagos ni aplicar recargos).
              </p>
            ) : null}
          </div>
          {mostrarAccionesCronograma &&
            (cuotaHabilitada ? (
              <div className="vp-cronograma-cta">
                <div className="vp-cronograma-cta__context">
                  <span className="vp-cronograma-cta__label">Cuota habilitada para cobro</span>
                  <span className="vp-cronograma-cta__meta">
                    #{cuotaHabilitada.numeroCuota}
                    <span className="vp-cronograma-cta__sep">·</span>
                    {cuotaHabilitada.tipoCuota ?? "—"}
                    <span className="vp-cronograma-cta__sep">·</span>
                    {monedaVistaPlan}
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
        {planVista.cuotas.length > 0 ? (
          <div className="vp-table-wrap">
            <table className="vp-table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Tipo</th>
                  <th>Vencimiento</th>
                  <th className="vp-th-num vp-th-recargo">Recargo</th>
                  <th className="vp-th-num vp-th-exigible">Monto exigible</th>
                  <th className="vp-th-num vp-th-pagado">Pagado</th>
                  <th className="vp-th-num vp-th-saldo">Saldo</th>
                  <th>Estado</th>
                  {mostrarAccionesCronograma ? <th className="vp-th-acciones">Acciones</th> : null}
                </tr>
              </thead>
              <tbody>
                {planVista.cuotas.map((c) => {
                  const vencida = Boolean(c.estaVencida);
                  const habilitada =
                    mostrarAccionesCronograma && cuotaHabilitada && c.id === cuotaHabilitada.id;
                  const conRecargo = Number(c.montoRecargoManual) > 0;
                  const rowClass = [
                    vencida ? "vp-row--vencida" : "",
                    habilitada ? "vp-row--habilitada" : "",
                    conRecargo ? "vp-row--con-recargo" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={c.id} className={rowClass || undefined}>
                      <td>{c.numeroCuota}</td>
                      <td>{c.tipoCuota ?? "—"}</td>
                      <td>{fmtFecha(c.fechaVencimiento)}</td>
                      <td className="vp-cell-num vp-cell-recargo">
                        {fmtMonto(c.montoRecargoManual ?? 0, monedaVistaPlan)}
                      </td>
                      <td className="vp-cell-num vp-cell-exigible">
                        {fmtMonto(c.montoTotalExigible ?? c.montoOriginal, monedaVistaPlan)}
                      </td>
                      <td className="vp-cell-num vp-cell-pagado">{fmtMonto(c.montoPagado, monedaVistaPlan)}</td>
                      <td className="vp-cell-num vp-cell-saldo-crono">
                        {fmtMonto(c.saldoPendiente, monedaVistaPlan)}
                      </td>
                      <td>
                        {vencida ? (
                          <span className="vp-badge-cuota vp-badge--vencida">VENCIDA</span>
                        ) : (
                          <span className={`vp-badge-cuota ${getCuotaBadgeClass(c.estadoCuota)}`}>
                            {c.estadoCuota ?? "—"}
                          </span>
                        )}
                      </td>
                      {mostrarAccionesCronograma ? (
                        <td className="vp-cell-acciones">
                          {puedeAplicarRecargoCuota(c) ? (
                            <Can permission={PERMISSIONS.SALE_EDIT}>
                              <button
                                type="button"
                                className="vp-btn-recargo"
                                onClick={() => {
                                  setCuotaRecargoSeleccionada(c);
                                  setShowRecargoModal(true);
                                }}
                              >
                                Aplicar recargo
                              </button>
                            </Can>
                          ) : (
                            <span className="vp-acciones-vacio" aria-label="Sin acciones disponibles" />
                          )}
                        </td>
                      ) : null}
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

      {/* E. Historial de pagos (global a la venta; no depende del plan seleccionado) */}
      <div className="vp-summary-card vp-section-block">
        <h5 className="vp-section-title vp-section-title--with-icon mb-0">
          <History className="vp-section-title__icon" size={18} strokeWidth={2} aria-hidden />
          Historial de pagos
        </h5>
        <p className="vp-section-subtitle">Historial total de pagos de la venta.</p>
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
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtFecha(p.fechaPago)}</td>
                    <td className="vp-cell-num">{fmtMonto(p.monto, moneda)}</td>
                    <td>{p.medioPago ?? "—"}</td>
                    <td>{p.referenciaCuotaUi ?? "—"}</td>
                    <td>{p.referencia ?? "—"}</td>
                    <td>{p.observacion ?? "—"}</td>
                    <td>{p.registradoBy ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="vp-empty">No hay pagos registrados.</div>
        )}
      </div>

      {/* Modal flotante: Crear plan de pago */}
      {!planVigente && !modoConsultaCancelada && (
        <PlanCrearForm
          open={showFormPlan}
          ventaId={parseInt(ventaId, 10)}
          montoVentaBloqueado={data?.venta?.monto}
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

      {planVigente && cuotaRecargoSeleccionada && (
        <RecargoAplicarCard
          key={cuotaRecargoSeleccionada.id}
          open={showRecargoModal}
          ventaId={parseInt(ventaId, 10)}
          cuota={cuotaRecargoSeleccionada}
          moneda={moneda}
          onSuccess={handleRecargoAplicado}
          onCancel={() => {
            setShowRecargoModal(false);
            setCuotaRecargoSeleccionada(null);
          }}
        />
      )}

      {planVigente && showReemplazoModal && puedeMostrarReemplazoPlan && (
        <PlanCrearForm
          open
          ventaId={parseInt(ventaId, 10)}
          mode="reemplazo"
          reemplazoContext={{
            nombrePlanActual: planVigente.nombre,
            version: planVigente.version,
            tipoFinanciacion: planVigente.tipoFinanciacion,
            moneda: planVigente.moneda ?? "ARS",
            saldoPendienteReal: Number(resumenCoherente.saldoPendienteTotal),
          }}
          onSuccess={handlePlanReemplazado}
          onCancel={() => setShowReemplazoModal(false)}
        />
      )}
    </div>
  );
}
