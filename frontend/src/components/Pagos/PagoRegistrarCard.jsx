// src/components/Pagos/PagoRegistrarCard.jsx
// Card/modal flotante para registrar un pago sobre la cuota habilitada (Bloque 1 I4).

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrarPagoEnVenta } from "../../lib/api/pagos";
import { toDateInputValue, fromDateInputToISO } from "../../utils/ventaDateUtils";
import { mapPagoBackendError } from "../../utils/pagoErrorMapper";
import { createRegistrarPagoSchema } from "../../lib/validations/registrarPago.schema.js";
import { MEDIOS_PAGO_OPTIONS } from "../../lib/constants/pagos";
import NiceSelect from "../Base/NiceSelect.jsx";
import { estaCuotaVencida } from "../../utils/pagoUtils";
import "../Cards/Base/cards.css";
import "../../styles/venta-pagos.css";

const fmtMonto = (v, moneda = "ARS") => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  const currency = String(moneda || "ARS").toUpperCase();
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "ARS",
    maximumFractionDigits: 2,
  });
};

const fmtFecha = (v) => {
  if (!v) return "—";
  try {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-AR");
  } catch {
    return "—";
  }
};

export default function PagoRegistrarCard({ open, ventaId, cuotaHabilitada, moneda, onSuccess, onCancel }) {
  const saldoPendiente = Number(cuotaHabilitada?.saldoPendiente) || 0;
  const schema = createRegistrarPagoSchema(saldoPendiente);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fechaPago: toDateInputValue(new Date()),
      monto: "",
      medioPago: "",
      referencia: "",
      observacion: "",
    },
    // Validar al intentar registrar; luego revalidar al salir del campo (evita NaN / ruido al borrar)
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    reset({
      fechaPago: toDateInputValue(new Date()),
      monto: "",
      medioPago: "",
      referencia: "",
      observacion: "",
    });
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, reset]);

  const handleCancel = () => {
    if (!saving) onCancel?.();
  };

  const onSubmit = async (data) => {
    setError("root", { message: "" });
    setSaving(true);
    try {
      const payload = {
        cuotaId: cuotaHabilitada.id,
        fechaPago: fromDateInputToISO(data.fechaPago),
        monto: Number(data.monto),
        medioPago: data.medioPago,
      };
      if (data.referencia?.trim()) payload.referencia = data.referencia.trim();
      if (data.observacion?.trim()) payload.observacion = data.observacion.trim();

      await registrarPagoEnVenta(ventaId, payload);
      onSuccess?.();
    } catch (err) {
      const { fieldErrors, generalMessage } = mapPagoBackendError(err, {
        defaultMessage: "Error al registrar el pago",
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
  if (!cuotaHabilitada) return null;

  const vencida = estaCuotaVencida(cuotaHabilitada.fechaVencimiento, saldoPendiente);

  return (
    <div className="cclf-overlay" onClick={!saving ? handleCancel : undefined}>
      <div className="cclf-card" onClick={(e) => e.stopPropagation()}>
        <div className="cclf-card__header">
          <div>
            <h2 className="cclf-card__title">Registrar pago</h2>
            <p className="vp-plan-form__subtitle-modal">
              Cuota {cuotaHabilitada.numeroCuota} — {cuotaHabilitada.tipoCuota ?? "—"}
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

        <div className="cclf-card__body vp-plan-form__body">
          <div className="vp-plan-form__scroll">
            <form onSubmit={handleSubmit(onSubmit)} id="pago-registrar-form">
              {errors.root && (
                <div className="alert alert-danger mb-3" role="alert">
                  {errors.root.message}
                </div>
              )}

              {/* Contexto de la cuota */}
              <div className="vp-plan-form__section">
                <h6 className="vp-plan-form__subtitle">Cuota a pagar</h6>
                <div className="vp-pago-contexto-cuota">
                  <div className="vp-pago-contexto-grid">
                    <div className="vp-pago-contexto-item">
                      <span className="vp-pago-contexto-label">Nº cuota</span>
                      <span className="vp-pago-contexto-value">{cuotaHabilitada.numeroCuota}</span>
                    </div>
                    <div className="vp-pago-contexto-item">
                      <span className="vp-pago-contexto-label">Tipo</span>
                      <span className="vp-pago-contexto-value">{cuotaHabilitada.tipoCuota ?? "—"}</span>
                    </div>
                    <div className="vp-pago-contexto-item">
                      <span className="vp-pago-contexto-label">Vencimiento</span>
                      <span className="vp-pago-contexto-value">{fmtFecha(cuotaHabilitada.fechaVencimiento)}</span>
                    </div>
                    <div className="vp-pago-contexto-item">
                      <span className="vp-pago-contexto-label">Monto exigible</span>
                      <span className="vp-pago-contexto-value">
                        {fmtMonto(cuotaHabilitada.montoTotalExigible ?? cuotaHabilitada.montoOriginal, moneda)}
                      </span>
                    </div>
                    <div className="vp-pago-contexto-item">
                      <span className="vp-pago-contexto-label">Pagado</span>
                      <span className="vp-pago-contexto-value">{fmtMonto(cuotaHabilitada.montoPagado, moneda)}</span>
                    </div>
                    <div className="vp-pago-contexto-item">
                      <span className="vp-pago-contexto-label">Saldo pendiente</span>
                      <span className="vp-pago-contexto-value vp-pago-contexto-value--warn">
                        {fmtMonto(saldoPendiente, moneda)}
                      </span>
                    </div>
                    <div className="vp-pago-contexto-item">
                      <span className="vp-pago-contexto-label">Moneda</span>
                      <span className="vp-pago-contexto-value">{moneda ?? "ARS"}</span>
                    </div>
                    {vencida && (
                      <div className="vp-pago-contexto-item vp-pago-contexto-item--vencida">
                        <span className="vp-badge vp-badge--danger">Vencida</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div className="vp-plan-form__section">
                <h6 className="vp-plan-form__subtitle">Datos del pago</h6>
                <div className="venta-grid" style={{ "--sale-label-w": "180px" }}>
                  <div className="venta-col">
                    <div className={`fieldRow ${errors.fechaPago ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label">Fecha de pago *</div>
                        <div className="field-value p0">
                          <input
                            type="date"
                            className={`field-input ${errors.fechaPago ? "is-invalid" : ""}`}
                            {...register("fechaPago")}
                          />
                        </div>
                      </div>
                      {errors.fechaPago && <div className="fieldError">{errors.fechaPago.message}</div>}
                    </div>

                    <div className={`fieldRow ${errors.monto ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label">Monto *</div>
                        <div className="field-value p0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            className={`field-input vp-input-monto ${errors.monto ? "is-invalid" : ""}`}
                            placeholder={saldoPendiente.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            onWheel={(e) => e.currentTarget.blur()}
                            {...register("monto")}
                          />
                        </div>
                      </div>
                      {errors.monto && <div className="fieldError">{errors.monto.message}</div>}
                    </div>

                    <div className={`fieldRow ${errors.medioPago ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label">Medio de pago *</div>
                        <div className="field-value p0">
                          <Controller
                            name="medioPago"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                              <NiceSelect
                                value={value ?? ""}
                                options={MEDIOS_PAGO_OPTIONS}
                                placeholder="Seleccionar"
                                showPlaceholderOption
                                usePortal
                                onChange={onChange}
                              />
                            )}
                          />
                        </div>
                      </div>
                      {errors.medioPago && <div className="fieldError">{errors.medioPago.message}</div>}
                    </div>

                    <div className={`fieldRow ${errors.referencia ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label">Referencia</div>
                        <div className="field-value p0">
                          <input
                            type="text"
                            className={`field-input ${errors.referencia ? "is-invalid" : ""}`}
                            {...register("referencia")}
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                      {errors.referencia && <div className="fieldError">{errors.referencia.message}</div>}
                    </div>

                    <div className={`fieldRow ${errors.observacion ? "hasError" : ""}`}>
                      <div className="field-row">
                        <div className="field-label">Observación</div>
                        <div className="field-value p0">
                          <input
                            type="text"
                            className={`field-input ${errors.observacion ? "is-invalid" : ""}`}
                            {...register("observacion")}
                            placeholder="Opcional"
                          />
                        </div>
                      </div>
                      {errors.observacion && <div className="fieldError">{errors.observacion.message}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div className="cclf-footer vp-plan-form__footer">
            <button className="btn btn-outline" type="button" onClick={handleCancel}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              form="pago-registrar-form"
              disabled={saving}
            >
              {saving ? "Guardando…" : "Registrar pago"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
