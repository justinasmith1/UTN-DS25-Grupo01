// src/components/Pagos/PlanCrearForm.jsx
// Formulario para crear el plan inicial de pagos (Bloque 1 I3).
// Se abre como card/modal flotante bloqueante (cclf-overlay + cclf-card).

import { useEffect, useState, useRef, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Info } from "lucide-react";
import { createPlanPagoInicial, reemplazarPlanPago } from "../../lib/api/pagos";
import { toDateInputValue, fromDateInputToISO } from "../../utils/ventaDateUtils";
import { mapPagoBackendError, mapReemplazarPlanPagoError } from "../../utils/pagoErrorMapper";
import { fmtMonto } from "../../utils/pagoUtils";
import { planPagoCreateSchema } from "../../lib/validations/planPagoCreate.schema.js";
import {
  TIPOS_FINANCIACION_OPTIONS,
  MONEDAS_OPTIONS,
  TIPOS_CUOTA_OPTIONS,
  CADENCIA_OPTIONS,
} from "../../lib/constants/pagos";
import {
  generateCuotasContado,
  generateCuotasFijas,
  generateCuotasAnticipo,
  CADENCIA_MESES,
} from "../../utils/cronogramaGenerator";
import NiceSelect from "../Base/NiceSelect.jsx";
import "../Cards/Base/cards.css";
import "../Table/TablaLotes/TablaLotes.css";
import "../../styles/venta-pagos.css";

/** Extrae el mensaje de error del cronograma (cuotas) desde el objeto errors */
const getCronogramaError = (err) => err?.cuotas?.root?.message || err?.cuotas?.message;

const emptyCuota = () => ({
  numeroCuota: "",
  tipoCuota: "",
  fechaVencimiento: "",
  montoOriginal: "",
  descripcion: "",
});

const getDefaultValues = () => {
  const fechaBase = toDateInputValue(new Date());
  return {
    nombre: "",
    tipoFinanciacion: "",
    moneda: "ARS",
    cantidadCuotas: "",
    montoTotalPlanificado: "",
    fechaInicio: fechaBase,
    montoAnticipo: "",
    observaciones: "",
    descripcion: "",
    primerVencimiento: fechaBase,
    cadencia: "mensual",
    cuotas: [emptyCuota()],
  };
};

export default function PlanCrearForm({
  ventaId,
  onSuccess,
  onCancel,
  open,
  mode = "crear",
  reemplazoContext = null,
}) {
  const isReemplazo = mode === "reemplazo";
  const formId = isReemplazo ? "plan-reemplazar-form" : "plan-crear-form";
  const saldoReemplazo = reemplazoContext?.saldoPendienteReal;
  const monedaReemplazo = reemplazoContext?.moneda;

  const defaultFormValues = useMemo(() => {
    if (isReemplazo && saldoReemplazo != null && monedaReemplazo) {
      const n = Number(saldoReemplazo);
      if (!Number.isNaN(n) && n > 0) {
        return {
          ...getDefaultValues(),
          moneda: monedaReemplazo,
          montoTotalPlanificado: n.toFixed(2),
        };
      }
    }
    return getDefaultValues();
  }, [isReemplazo, saldoReemplazo, monedaReemplazo]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setError,
    setValue,
    clearErrors,
    watch,
  } = useForm({
    resolver: zodResolver(planPagoCreateSchema),
    defaultValues: defaultFormValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "cuotas",
  });

  const [saving, setSaving] = useState(false);
  const [pendingRegenerarConfirm, setPendingRegenerarConfirm] = useState(false);
  const cronogramaErrorRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setPendingRegenerarConfirm(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const formValues = watch();
  const tipoFinanciacion = formValues.tipoFinanciacion;

  useEffect(() => {
    if (tipoFinanciacion === "CONTADO") {
      setValue("cantidadCuotas", 1);
      setValue("montoAnticipo", "");
    } else if (tipoFinanciacion === "PERSONALIZADO") {
      setValue("cantidadCuotas", fields.length);
    }
  }, [tipoFinanciacion, fields.length, setValue]);

  const cronogramaErrorMsg = getCronogramaError(errors);
  useEffect(() => {
    if (cronogramaErrorMsg && cronogramaErrorRef.current) {
      cronogramaErrorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [cronogramaErrorMsg]);

  const showConfigGeneracion = tipoFinanciacion && tipoFinanciacion !== "PERSONALIZADO";
  const isContado = tipoFinanciacion === "CONTADO";
  const isAnticipoCuotas = tipoFinanciacion === "ANTICIPO_CUOTAS";
  const cantidadCuotasNum = parseInt(formValues.cantidadCuotas, 10);
  const cantidadCuotasTarget =
    isContado
      ? 1
      : !formValues.cantidadCuotas ||
        Number.isNaN(cantidadCuotasNum) ||
        cantidadCuotasNum <= 0
      ? null
      : cantidadCuotasNum;

  const ejecutarGeneracion = () => {
    setPendingRegenerarConfirm(false);
    clearErrors();
    const cantidadCuotas = parseInt(formValues.cantidadCuotas, 10);
    const montoTotalPlanificado = parseFloat(formValues.montoTotalPlanificado);
    const montoAnticipo = parseFloat(formValues.montoAnticipo) || 0;
    const primerVencimiento = (formValues.primerVencimiento || "").trim();
    const cadencia = formValues.cadencia || "mensual";
    const fechaInicio = (formValues.fechaInicio || "").trim();

    const errores = [];
    if (!formValues.montoTotalPlanificado || Number.isNaN(montoTotalPlanificado) || montoTotalPlanificado <= 0) {
      setError("montoTotalPlanificado", { type: "manual", message: "El monto debe ser mayor a 0" });
      errores.push("montoTotalPlanificado");
    }
    if (!fechaInicio || Number.isNaN(new Date(`${fechaInicio}T12:00:00`).getTime())) {
      setError("fechaInicio", { type: "manual", message: "La fecha de inicio es obligatoria" });
      errores.push("fechaInicio");
    }
    if (!primerVencimiento || Number.isNaN(new Date(`${primerVencimiento}T12:00:00`).getTime())) {
      setError("primerVencimiento", { type: "manual", message: "El primer vencimiento es obligatorio" });
      errores.push("primerVencimiento");
    }
    if (!isContado) {
      if (!formValues.cantidadCuotas || Number.isNaN(cantidadCuotas) || cantidadCuotas <= 0) {
        setError("cantidadCuotas", { type: "manual", message: "La cantidad de cuotas debe ser un número positivo" });
        errores.push("cantidadCuotas");
      }
      if (!cadencia || !Object.keys(CADENCIA_MESES).includes(cadencia)) {
        setError("cadencia", { type: "manual", message: "La cadencia es obligatoria" });
        errores.push("cadencia");
      }
    }
    if (isAnticipoCuotas && (Number.isNaN(montoAnticipo) || montoAnticipo <= 0)) {
      setError("montoAnticipo", { type: "manual", message: "Para Anticipo + cuotas, el anticipo es obligatorio y debe ser mayor a 0" });
      errores.push("montoAnticipo");
    }
    if (errores.length > 0) return;

    let cuotas = [];
    if (isContado) {
      cuotas = generateCuotasContado(montoTotalPlanificado, primerVencimiento);
      setValue("cantidadCuotas", 1);
    } else if (isAnticipoCuotas) {
      const montoFinanciado = montoTotalPlanificado - montoAnticipo;
      cuotas = generateCuotasAnticipo(montoAnticipo, cantidadCuotas, montoFinanciado, primerVencimiento, cadencia);
    } else {
      const montoFinanciado = montoTotalPlanificado - montoAnticipo;
      cuotas = generateCuotasFijas(cantidadCuotas, montoFinanciado, primerVencimiento, cadencia);
    }
    replace(cuotas);
  };

  const handleGenerarCronograma = () => {
    const cuotas = formValues.cuotas ?? [];
    const hayCuotasCargadas = cuotas.length > 1 || cuotas.some((c) => (c?.montoOriginal && parseFloat(c.montoOriginal) > 0) || (c?.fechaVencimiento && String(c.fechaVencimiento).trim()));
    if (hayCuotasCargadas) {
      setPendingRegenerarConfirm(true);
      return;
    }
    ejecutarGeneracion();
  };

  const handleConfirmarRegenerar = () => {
    ejecutarGeneracion();
  };

  const handleAppendCuota = () => {
    const nuevaCantidad = fields.length + 1;
    setValue("cantidadCuotas", nuevaCantidad);
    append(emptyCuota());
  };

  const handleRemoveCuota = (i) => {
    if (fields.length <= 1) return;
    setValue("cantidadCuotas", fields.length - 1);
    remove(i);
  };

  const handleCancel = () => {
    setPendingRegenerarConfirm(false);
    reset(getDefaultValues());
    onCancel?.();
  };

  const onInvalid = (validationErrors) => {
    const msg = getCronogramaError(validationErrors);
    if (msg) {
      setError("cuotas.root", { type: "manual", message: msg });
      if (cronogramaErrorRef.current) {
        cronogramaErrorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  const onSubmit = async (data) => {
    clearErrors();
    setSaving(true);

    try {
      const cuotasPayload = data.cuotas.map((c) => ({
        numeroCuota: Number(c.numeroCuota),
        tipoCuota: c.tipoCuota,
        fechaVencimiento: fromDateInputToISO(c.fechaVencimiento),
        montoOriginal: Number(c.montoOriginal),
        ...(c.descripcion?.trim() ? { descripcion: c.descripcion.trim() } : {}),
      }));

      if (isReemplazo) {
        const payload = {
          nombre: String(data.nombre).trim(),
          tipoFinanciacion: data.tipoFinanciacion,
          cantidadCuotas: Number(data.cantidadCuotas),
          fechaInicio: fromDateInputToISO(data.fechaInicio),
          cuotas: cuotasPayload,
        };
        if (data.montoAnticipo !== undefined && data.montoAnticipo !== "") {
          payload.montoAnticipo = Number(data.montoAnticipo);
        }
        if (data.observaciones?.trim()) {
          payload.observaciones = data.observaciones.trim();
        }
        if (data.descripcion?.trim()) {
          payload.descripcion = data.descripcion.trim();
        }
        await reemplazarPlanPago(ventaId, payload);
      } else {
        const payload = {
          nombre: String(data.nombre).trim(),
          tipoFinanciacion: data.tipoFinanciacion,
          moneda: data.moneda,
          cantidadCuotas: Number(data.cantidadCuotas),
          montoTotalPlanificado: Number(data.montoTotalPlanificado),
          fechaInicio: fromDateInputToISO(data.fechaInicio),
          cuotas: cuotasPayload,
        };
        if (data.montoAnticipo !== undefined && data.montoAnticipo !== "") {
          payload.montoAnticipo = Number(data.montoAnticipo);
        }
        if (data.observaciones?.trim()) {
          payload.observaciones = data.observaciones.trim();
        }
        if (data.descripcion?.trim()) {
          payload.descripcion = data.descripcion.trim();
        }
        await createPlanPagoInicial(ventaId, payload);
      }
      await Promise.resolve(onSuccess?.());
    } catch (err) {
      const { fieldErrors, generalMessage } = isReemplazo
        ? mapReemplazarPlanPagoError(err)
        : mapPagoBackendError(err, { defaultMessage: "Error al crear el plan de pago" });
      Object.entries(fieldErrors).forEach(([field, message]) => {
        setError(field, { type: "manual", message });
      });
      if (generalMessage) {
        setError("root", { type: "manual", message: generalMessage });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="cclf-overlay" onClick={!saving ? handleCancel : undefined}>
      <div className="cclf-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cclf-card__header">
          <div>
            <h2 className="cclf-card__title">
              {isReemplazo ? "Reemplazar plan de pago" : "Crear plan de pago"}
            </h2>
            <p className="vp-plan-form__subtitle-modal">
              {isReemplazo
                ? "Armá el nuevo cronograma sobre el saldo pendiente real; el plan actual quedará en historial."
                : "Definí la financiación inicial de la venta"}
            </p>
          </div>
          <div className="cclf-card__actions">
            <button
              type="button"
              className="cclf-btn-close"
              onClick={handleCancel}
              aria-label="Cerrar"
              disabled={saving}
            >
              <span className="cclf-btn-close__x">&times;</span>
            </button>
          </div>
        </div>

        {/* Body con scroll interno y footer sticky */}
        <div className="cclf-card__body vp-plan-form__body">
          <div className="vp-plan-form__scroll">
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} id={formId}>
              {errors.root && (
                <div className="alert alert-danger mb-3" role="alert">
                  {errors.root.message}
                </div>
              )}

              {isReemplazo && reemplazoContext ? (
                <div className="vp-plan-form__section vp-plan-form__reemplazo-context">
                  <h6 className="vp-plan-form__subtitle">Plan que se reemplaza</h6>
                  <p className="vp-plan-form__reemplazo-nota text-muted small mb-3">
                    El plan actual pasará a estado histórico (reemplazado). No se pierden pagos ni datos anteriores.
                  </p>
                  <div className="venta-grid" style={{ "--sale-label-w": "200px" }}>
                    <div className="venta-col">
                      <div className="fieldRow">
                        <div className="field-row">
                          <div className="field-label">Nombre del plan vigente</div>
                          <div className="field-value is-readonly">{reemplazoContext.nombrePlanActual}</div>
                        </div>
                      </div>
                      <div className="fieldRow">
                        <div className="field-row">
                          <div className="field-label">Versión actual</div>
                          <div className="field-value is-readonly">{reemplazoContext.version}</div>
                        </div>
                      </div>
                    </div>
                    <div className="venta-col">
                      <div className="fieldRow">
                        <div className="field-row">
                          <div className="field-label">Tipo de financiación actual</div>
                          <div className="field-value is-readonly">
                            {reemplazoContext.tipoFinanciacion ?? "—"}
                          </div>
                        </div>
                      </div>
                      <div className="fieldRow">
                        <div className="field-row">
                          <div className="field-label">Moneda del plan</div>
                          <div className="field-value is-readonly">{reemplazoContext.moneda}</div>
                        </div>
                      </div>
                    </div>
                    <div className="venta-col venta-col--span-all">
                      <div className="fieldRow">
                        <div className="field-row">
                          <div className="field-label">Saldo pendiente real (base del nuevo plan)</div>
                          <div className="field-value is-readonly">
                            {fmtMonto(reemplazoContext.saldoPendienteReal, reemplazoContext.moneda)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* A. Datos generales */}
              <div className="vp-plan-form__section">
                <h6 className="vp-plan-form__subtitle">Datos generales</h6>
                <div className="venta-grid" style={{ "--sale-label-w": "180px" }}>
                  <div className="venta-col">
                    <div className={`fieldRow ${errors.nombre ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label">Nombre *</div>
                        <div className="field-value p0">
                          <input
                            className={`field-input ${errors.nombre ? "is-invalid" : ""}`}
                            {...register("nombre")}
                            placeholder="Ej: Plan estándar"
                          />
                        </div>
                      </div>
                      {errors.nombre && (
                        <div className="fieldError">{errors.nombre.message}</div>
                      )}
                    </div>

                    <div className={`fieldRow ${errors.tipoFinanciacion ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label">Tipo financiación *</div>
                        <div className="field-value p0">
                          <Controller
                            name="tipoFinanciacion"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                              <NiceSelect
                                value={value ?? ""}
                                options={TIPOS_FINANCIACION_OPTIONS}
                                placeholder="Seleccionar"
                                showPlaceholderOption
                                usePortal
                                onChange={onChange}
                              />
                            )}
                          />
                        </div>
                      </div>
                      {errors.tipoFinanciacion && (
                        <div className="fieldError">
                          {errors.tipoFinanciacion.message}
                        </div>
                      )}
                    </div>

                    <div className={`fieldRow ${errors.moneda ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label" title="Moneda *">
                          Moneda *
                        </div>
                        {isReemplazo ? (
                          <div className="field-value is-readonly">
                            <input type="hidden" {...register("moneda")} />
                            {formValues.moneda ?? monedaReemplazo ?? "—"}
                          </div>
                        ) : (
                          <div className="field-value p0">
                            <Controller
                              name="moneda"
                              control={control}
                              render={({ field: { onChange, value } }) => (
                                <NiceSelect
                                  value={value ?? ""}
                                  options={MONEDAS_OPTIONS}
                                  placeholder="Moneda"
                                  usePortal
                                  onChange={onChange}
                                />
                              )}
                            />
                          </div>
                        )}
                      </div>
                      {errors.moneda && (
                        <div className="fieldError">{errors.moneda.message}</div>
                      )}
                    </div>

                    {!isContado && (
                      <div className={`fieldRow ${errors.cantidadCuotas ? "hasError" : ""}`}>
                        <div className="field-row">
                          <div className="field-label">Cantidad cuotas *</div>
                          <div className="field-value p0">
                            <input
                              type="number"
                              min="1"
                              className={`field-input ${errors.cantidadCuotas ? "is-invalid" : ""}`}
                              {...register("cantidadCuotas")}
                              placeholder="Ej: 12"
                            />
                          </div>
                        </div>
                        {errors.cantidadCuotas && (
                          <div className="fieldError">
                            {errors.cantidadCuotas.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="venta-col">
                    <div className={`fieldRow ${errors.montoTotalPlanificado ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label vp-label-monto">
                          <span
                            className="vp-label-monto__icon"
                            title={
                              isReemplazo
                                ? "Saldo pendiente real a redistribuir en el nuevo cronograma"
                                : "Monto total planificado *"
                            }
                            aria-label={isReemplazo ? "Saldo pendiente real a redistribuir" : "Monto total planificado"}
                          >
                            <Info size={14} />
                          </span>
                          <span className="vp-label-monto__text">
                            {isReemplazo
                              ? "Saldo pendiente real a redistribuir *"
                              : "Monto total planificado *"}
                          </span>
                        </div>
                        <div className="field-value p0">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className={`field-input vp-input-monto ${isReemplazo ? "is-readonly" : ""} ${errors.montoTotalPlanificado ? "is-invalid" : ""}`}
                            onWheel={(e) => e.currentTarget.blur()}
                            readOnly={isReemplazo}
                            aria-readonly={isReemplazo}
                            {...register("montoTotalPlanificado")}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      {errors.montoTotalPlanificado && (
                        <div className="fieldError">
                          {errors.montoTotalPlanificado.message}
                        </div>
                      )}
                    </div>

                    <div className={`fieldRow ${errors.fechaInicio ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label">Fecha inicio *</div>
                        <div className="field-value p0">
                          <input
                            type="date"
                            className={`field-input ${errors.fechaInicio ? "is-invalid" : ""}`}
                            {...register("fechaInicio")}
                          />
                        </div>
                      </div>
                      {errors.fechaInicio && (
                        <div className="fieldError">
                          {errors.fechaInicio.message}
                        </div>
                      )}
                    </div>

                    {!isContado && (
                      <div className={`fieldRow ${errors.montoAnticipo ? "hasError" : ""} ${isAnticipoCuotas ? "vp-field-anticipo--required" : ""}`}>
                        <div className="field-row">
                          <div className="field-label">{isAnticipoCuotas ? "Anticipo *" : "Anticipo"}</div>
                          <div className="field-value p0">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              className={`field-input vp-input-monto ${errors.montoAnticipo ? "is-invalid" : ""}`}
                              onWheel={(e) => e.currentTarget.blur()}
                              {...register("montoAnticipo")}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        {errors.montoAnticipo && (
                          <div className="fieldError">
                            {errors.montoAnticipo.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="venta-col venta-col--span-all">
                    <div className="fieldRow">
                      <div className="field-row">
                        <div className="field-label">Observaciones</div>
                        <div className="field-value p0">
                          <input
                            className="field-input"
                            {...register("observaciones")}
                            placeholder="Observaciones del plan"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="fieldRow">
                      <div className="field-row">
                        <div className="field-label">Descripción</div>
                        <div className="field-value p0">
                          <input
                            className="field-input"
                            {...register("descripcion")}
                            placeholder="Descripción del plan"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* B. Configuración del cronograma (visible salvo PERSONALIZADO) */}
              {showConfigGeneracion && (
                <div className="vp-plan-form__section vp-plan-form__config">
                  <h6 className="vp-plan-form__subtitle">Configuración del cronograma</h6>
                  <div className="venta-grid" style={{ "--sale-label-w": "180px" }}>
                    <div className="venta-col">
                      <div className={`fieldRow ${errors.primerVencimiento ? "hasError" : ""}`}>
                        <div className="field-row">
                          <div className="field-label vp-label-primer-vencimiento">Primer vencimiento *</div>
                          <div className="field-value p0">
                            <input
                              type="date"
                              className={`field-input ${errors.primerVencimiento ? "is-invalid" : ""}`}
                              {...register("primerVencimiento")}
                            />
                          </div>
                        </div>
                        {errors.primerVencimiento && (
                          <div className="fieldError">{errors.primerVencimiento.message}</div>
                        )}
                      </div>
                    </div>
                    {!isContado && (
                      <div className="venta-col">
                        <div className={`fieldRow ${errors.cadencia ? "hasError" : ""}`}>
                          <div className="field-row">
                            <div className="field-label">Cadencia *</div>
                            <div className="field-value p0">
                              <Controller
                                name="cadencia"
                                control={control}
                                render={({ field: { onChange, value } }) => (
                                  <NiceSelect
                                    value={value ?? "mensual"}
                                    options={CADENCIA_OPTIONS}
                                    placeholder="Seleccionar"
                                    usePortal
                                    onChange={onChange}
                                  />
                                )}
                              />
                            </div>
                          </div>
                          {errors.cadencia && (
                            <div className="fieldError">{errors.cadencia.message}</div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="venta-col venta-col--span-all">
                      {pendingRegenerarConfirm ? (
                        <div className="vp-plan-form__confirm-regenerar">
                          <p className="vp-plan-form__confirm-msg">El cronograma actual será reemplazado. ¿Regenerar?</p>
                          <div className="vp-plan-form__confirm-actions">
                            <button type="button" className="btn btn-outline" onClick={() => setPendingRegenerarConfirm(false)}>
                              Cancelar
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleConfirmarRegenerar}>
                              Sí, regenerar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="vp-plan-form__config-hint">Completá los campos obligatorios y generá. Al generar se reemplaza el cronograma actual.</p>
                          <button
                            type="button"
                            className="btn btn-primary vp-btn-generar"
                            onClick={handleGenerarCronograma}
                          >
                            Generar cronograma
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* C. Cronograma de cuotas */}
              <div className="vp-plan-form__section vp-plan-form__cronograma">
                {tipoFinanciacion === "PERSONALIZADO" && (
                  <p className="vp-plan-form__cronograma-manual-hint">
                    Cargá las cuotas manualmente. Agregá o eliminá filas según necesites. La cantidad se sincroniza automáticamente.
                  </p>
                )}
                <div className="vp-plan-form__cronograma-header">
                  <h6 className="vp-plan-form__subtitle">
                    Cronograma de cuotas
                  </h6>
                  <span className="vp-plan-form__cuota-counter">
                    Cuotas cargadas: {fields.length}
                    {cantidadCuotasTarget != null ? ` / ${cantidadCuotasTarget}` : ""}
                  </span>
                </div>
                {cronogramaErrorMsg && (
                  <div ref={cronogramaErrorRef} className="vp-plan-form__cuota-error mb-2" role="alert">
                    {cronogramaErrorMsg}
                  </div>
                )}
                <div className="vp-table-wrap">
                  <table className="vp-table vp-table--edit">
                    <thead>
                      <tr>
                        <th>Nº</th>
                        <th>Tipo</th>
                        <th>Vencimiento</th>
                        <th className="vp-th-num">Monto</th>
                        <th>Descripción</th>
                        <th className="vp-th-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, i) => (
                        <tr key={field.id}>
                          <td>
                            <input
                              type="number"
                              min="1"
                              className={`vp-cell-input field-input ${errors.cuotas?.[i]?.numeroCuota ? "is-invalid" : ""}`}
                              {...register(`cuotas.${i}.numeroCuota`)}
                              style={{ width: 60 }}
                            />
                            {errors.cuotas?.[i]?.numeroCuota && (
                              <div className="vp-plan-form__cell-error">
                                {errors.cuotas[i].numeroCuota.message}
                              </div>
                            )}
                          </td>
                          <td>
                            <Controller
                              name={`cuotas.${i}.tipoCuota`}
                              control={control}
                              render={({ field: { onChange, value } }) => (
                                <NiceSelect
                                  value={value ?? ""}
                                  options={TIPOS_CUOTA_OPTIONS}
                                  placeholder="Seleccionar"
                                  showPlaceholderOption
                                  usePortal
                                  onChange={onChange}
                                />
                              )}
                            />
                            {errors.cuotas?.[i]?.tipoCuota && (
                              <div className="vp-plan-form__cell-error">
                                {errors.cuotas[i].tipoCuota.message}
                              </div>
                            )}
                          </td>
                          <td>
                            <input
                              type="date"
                              className={`vp-cell-input field-input ${errors.cuotas?.[i]?.fechaVencimiento ? "is-invalid" : ""}`}
                              {...register(`cuotas.${i}.fechaVencimiento`)}
                              style={{ minWidth: 130 }}
                            />
                            {errors.cuotas?.[i]?.fechaVencimiento && (
                              <div className="vp-plan-form__cell-error">
                                {errors.cuotas[i].fechaVencimiento.message}
                              </div>
                            )}
                          </td>
                          <td className="vp-cell-num vp-cell-monto">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              className={`vp-cell-input field-input vp-input-monto ${errors.cuotas?.[i]?.montoOriginal ? "is-invalid" : ""}`}
                              onWheel={(e) => e.currentTarget.blur()}
                              {...register(`cuotas.${i}.montoOriginal`)}
                              style={{ width: 110 }}
                            />
                            {errors.cuotas?.[i]?.montoOriginal && (
                              <div className="vp-plan-form__cell-error">
                                {errors.cuotas[i].montoOriginal.message}
                              </div>
                            )}
                          </td>
                          <td>
                            <input
                              type="text"
                              className="vp-cell-input field-input"
                              {...register(`cuotas.${i}.descripcion`)}
                              placeholder="Opcional"
                              style={{ minWidth: 100 }}
                            />
                          </td>
                          <td className="vp-td-actions">
                            <button
                              type="button"
                              className="tl-icon tl-icon--delete"
                              onClick={() => handleRemoveCuota(i)}
                              aria-label="Eliminar cuota"
                              title="Eliminar cuota"
                              disabled={fields.length <= 1}
                            >
                              <Trash2 size={18} strokeWidth={2} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  className="btn btn-primary vp-btn-agregar-cuota"
                  onClick={handleAppendCuota}
                >
                  + Agregar cuota
                </button>
              </div>
            </form>
          </div>

          {/* Footer sticky compacto */}
          <div className="cclf-footer vp-plan-form__footer">
            <button
              className="btn btn-outline"
              type="button"
              onClick={handleCancel}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              form={formId}
              disabled={saving}
            >
              {saving ? "Guardando…" : isReemplazo ? "Reemplazar plan" : "Crear plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
