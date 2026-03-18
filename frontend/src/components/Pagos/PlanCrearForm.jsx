// src/components/Pagos/PlanCrearForm.jsx
// Formulario para crear el plan inicial de pagos (Bloque 1 I3).
// Se abre como card/modal flotante bloqueante (cclf-overlay + cclf-card).

import { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Info } from "lucide-react";
import { createPlanPagoInicial } from "../../lib/api/pagos";
import { toDateInputValue, fromDateInputToISO } from "../../utils/ventaDateUtils";
import { mapPagoBackendError } from "../../utils/pagoErrorMapper";
import { planPagoCreateSchema } from "../../lib/validations/planPagoCreate.schema.js";
import NiceSelect from "../Base/NiceSelect.jsx";
import "../Cards/Base/cards.css";
import "../Table/TablaLotes/TablaLotes.css";
import "../../pages/VentaPagosPage.css";

const TIPOS_FINANCIACION = [
  { value: "CONTADO", label: "Contado" },
  { value: "ANTICIPO_CUOTAS", label: "Anticipo + cuotas" },
  { value: "CUOTAS_FIJAS", label: "Cuotas fijas" },
  { value: "PERSONALIZADO", label: "Personalizado" },
];

const MONEDAS = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
];

const TIPOS_CUOTA = [
  { value: "ANTICIPO", label: "Anticipo" },
  { value: "CUOTA", label: "Cuota" },
  { value: "OTRO", label: "Otro" },
];

const emptyCuota = () => ({
  numeroCuota: "",
  tipoCuota: "",
  fechaVencimiento: "",
  montoOriginal: "",
  descripcion: "",
});

const getDefaultValues = () => ({
  nombre: "",
  tipoFinanciacion: "",
  moneda: "ARS",
  cantidadCuotas: "",
  montoTotalPlanificado: "",
  fechaInicio: toDateInputValue(new Date()),
  montoAnticipo: "",
  observaciones: "",
  descripcion: "",
  cuotas: [emptyCuota()],
});

export default function PlanCrearForm({ ventaId, onSuccess, onCancel, open }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setError,
    clearErrors,
    watch,
  } = useForm({
    resolver: zodResolver(planPagoCreateSchema),
    defaultValues: getDefaultValues(),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "cuotas",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const formValues = watch();
  const cantidadCuotasNum = parseInt(formValues.cantidadCuotas, 10);
  const cantidadCuotasTarget =
    !formValues.cantidadCuotas ||
    Number.isNaN(cantidadCuotasNum) ||
    cantidadCuotasNum <= 0
      ? null
      : cantidadCuotasNum;

  const handleCancel = () => {
    reset(getDefaultValues());
    onCancel?.();
  };

  const onSubmit = async (data) => {
    clearErrors();
    setSaving(true);

    try {
      const payload = {
        nombre: String(data.nombre).trim(),
        tipoFinanciacion: data.tipoFinanciacion,
        moneda: data.moneda,
        cantidadCuotas: Number(data.cantidadCuotas),
        montoTotalPlanificado: Number(data.montoTotalPlanificado),
        fechaInicio: fromDateInputToISO(data.fechaInicio),
        cuotas: data.cuotas.map((c) => ({
          numeroCuota: Number(c.numeroCuota),
          tipoCuota: c.tipoCuota,
          fechaVencimiento: fromDateInputToISO(c.fechaVencimiento),
          montoOriginal: Number(c.montoOriginal),
          ...(c.descripcion?.trim() ? { descripcion: c.descripcion.trim() } : {}),
        })),
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
      onSuccess?.();
    } catch (err) {
      const { fieldErrors, generalMessage } = mapPagoBackendError(err, {
        defaultMessage: "Error al crear el plan de pago",
      });
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
            <h2 className="cclf-card__title">Crear plan de pago</h2>
            <p className="vp-plan-form__subtitle-modal">
              Definí la financiación inicial de la venta
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
            <form onSubmit={handleSubmit(onSubmit)} id="plan-crear-form">
              {errors.root && (
                <div className="alert alert-danger mb-3" role="alert">
                  {errors.root.message}
                </div>
              )}

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
                                options={TIPOS_FINANCIACION}
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
                        <div className="field-value p0">
                          <Controller
                            name="moneda"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                              <NiceSelect
                                value={value ?? ""}
                                options={MONEDAS}
                                placeholder="Moneda"
                                usePortal
                                onChange={onChange}
                              />
                            )}
                          />
                        </div>
                      </div>
                      {errors.moneda && (
                        <div className="fieldError">{errors.moneda.message}</div>
                      )}
                    </div>

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
                  </div>

                  <div className="venta-col">
                    <div className={`fieldRow ${errors.montoTotalPlanificado ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label vp-label-monto">
                          <span
                            className="vp-label-monto__icon"
                            title="Monto total planificado *"
                            aria-label="Monto total planificado"
                          >
                            <Info size={14} />
                          </span>
                          <span className="vp-label-monto__text">Monto total planificado *</span>
                        </div>
                        <div className="field-value p0">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className={`field-input vp-input-monto ${errors.montoTotalPlanificado ? "is-invalid" : ""}`}
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

                    <div className={`fieldRow ${errors.montoAnticipo ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label">Anticipo</div>
                        <div className="field-value p0">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            className={`field-input vp-input-monto ${errors.montoAnticipo ? "is-invalid" : ""}`}
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

              {/* B. Cronograma de cuotas */}
              <div className="vp-plan-form__section vp-plan-form__cronograma">
                <div className="vp-plan-form__cronograma-header">
                  <h6 className="vp-plan-form__subtitle">
                    Cronograma de cuotas
                  </h6>
                  <span className="vp-plan-form__cuota-counter">
                    Cuotas cargadas: {fields.length}
                    {cantidadCuotasTarget != null ? ` / ${cantidadCuotasTarget}` : ""}
                  </span>
                </div>
                {errors.cuotas?.message && (
                  <div className="vp-plan-form__cuota-error mb-2">
                    {errors.cuotas.message}
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
                                  options={TIPOS_CUOTA}
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
                              onClick={() => remove(i)}
                              aria-label="Eliminar cuota"
                              title="Eliminar cuota"
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
                  onClick={() => append(emptyCuota())}
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
              form="plan-crear-form"
              disabled={saving}
            >
              {saving ? "Guardando…" : "Crear plan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
