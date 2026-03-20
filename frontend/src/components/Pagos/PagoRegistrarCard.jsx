// src/components/Pagos/PagoRegistrarCard.jsx
// Modal para registrar pago sobre la cuota habilitada del plan vigente.

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrarPagoEnVenta } from "../../lib/api/pagos";
import { toDateInputValue, fromDateInputToISO } from "../../utils/ventaDateUtils";
import { mapRegistrarPagoError } from "../../utils/pagoErrorMapper";
import { createRegistrarPagoSchema } from "../../lib/validations/registrarPago.schema.js";
import { MEDIOS_PAGO_OPTIONS } from "../../lib/constants/pagos";
import NiceSelect from "../Base/NiceSelect.jsx";
import { fmtMonto } from "../../utils/pagoUtils";
import { fmtFecha } from "../Table/TablaVentas/utils/formatters";
import "../Cards/Base/cards.css";
import "../../styles/venta-pagos.css";

function montoInicialDesdeSaldo(saldoPendiente) {
  const s = Number(saldoPendiente) || 0;
  if (s <= 0) return "";
  return Number(s.toFixed(2)).toString();
}

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
      monto: montoInicialDesdeSaldo(saldoPendiente),
      medioPago: "",
      referencia: "",
      observacion: "",
    },
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
      monto: montoInicialDesdeSaldo(saldoPendiente),
      medioPago: "",
      referencia: "",
      observacion: "",
    });
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, reset, saldoPendiente]);

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
      await Promise.resolve(onSuccess?.());
    } catch (err) {
      const { fieldErrors, generalMessage } = mapRegistrarPagoError(err);
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

  const vencida = Boolean(cuotaHabilitada.estaVencida);
  const exigible = cuotaHabilitada.montoTotalExigible ?? cuotaHabilitada.montoOriginal;

  return (
    <div className="cclf-overlay" onClick={!saving ? handleCancel : undefined}>
      <div className="cclf-card" onClick={(e) => e.stopPropagation()}>
        <div className="cclf-card__header">
          <div>
            <h2 className="cclf-card__title">Registrar pago</h2>
            <p className="vp-plan-form__subtitle-modal">Cobro sobre la cuota habilitada del plan vigente</p>
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
              {errors.root?.message ? (
                <div className="alert alert-danger mb-3" role="alert">
                  {errors.root.message}
                </div>
              ) : null}

              <div className="vp-plan-form__section">
                <h6 className="vp-plan-form__subtitle">Cuota a pagar</h6>
                <div className="vp-pago-contexto-cuota">
                  <div className="vp-pago-resumen__head">
                    <span className="vp-pago-resumen__nro">Cuota {cuotaHabilitada.numeroCuota}</span>
                    <span className="vp-pago-resumen__tipo">{cuotaHabilitada.tipoCuota ?? "—"}</span>
                    <span className="vp-pago-resumen__moneda">{moneda ?? "ARS"}</span>
                    {vencida ? <span className="vp-badge-cuota vp-badge--vencida">Vencida</span> : null}
                  </div>
                  <div className="vp-pago-resumen__grid">
                    <div className="vp-pago-resumen__cell">
                      <span className="vp-pago-contexto-label">Vencimiento</span>
                      <span className="vp-pago-contexto-value">{fmtFecha(cuotaHabilitada.fechaVencimiento)}</span>
                    </div>
                    <div className="vp-pago-resumen__cell">
                      <span className="vp-pago-contexto-label">Monto exigible</span>
                      <span className="vp-pago-contexto-value">{fmtMonto(exigible, moneda)}</span>
                    </div>
                    <div className="vp-pago-resumen__cell">
                      <span className="vp-pago-contexto-label">Pagado</span>
                      <span className="vp-pago-contexto-value">{fmtMonto(cuotaHabilitada.montoPagado, moneda)}</span>
                    </div>
                    <div className="vp-pago-resumen__cell vp-pago-resumen__saldo">
                      <span className="vp-pago-contexto-label">Saldo pendiente</span>
                      <span className="vp-pago-contexto-value vp-pago-contexto-value--warn">
                        {fmtMonto(saldoPendiente, moneda)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
                        <div className="field-label">Monto a registrar *</div>
                        <div className="field-value p0">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            className={`field-input vp-input-monto ${errors.monto ? "is-invalid" : ""}`}
                            placeholder="Total o pago parcial"
                            title="Por defecto el saldo pendiente; podés bajar el monto para un pago parcial"
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
                                placeholder="Elegir medio"
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
                            placeholder="Nº operación, comprobante…"
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
                            placeholder="Nota interna (opcional)"
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
