// Modal para aplicar recargo manual (monto fijo o %) sobre una cuota vencida.

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { aplicarRecargoEnVenta } from "../../lib/api/pagos";
import { mapAplicarRecargoError } from "../../utils/pagoErrorMapper";
import {
  createAplicarRecargoSchema,
  parseValorRecargo,
  roundRecargoMonto,
} from "../../lib/validations/aplicarRecargo.schema.js";
import { RECARGO_TIPO_OPTIONS } from "../../lib/constants/pagos";
import NiceSelect from "../Base/NiceSelect.jsx";
import { fmtMonto } from "../../utils/pagoUtils";
import { fmtFecha } from "../Table/TablaVentas/utils/formatters";
import "../Cards/Base/cards.css";
import "../../styles/venta-pagos.css";

export default function RecargoAplicarCard({ open, ventaId, cuota, moneda, onSuccess, onCancel }) {
  const montoOriginal = Number(cuota?.montoOriginal) || 0;
  const schema = useMemo(() => createAplicarRecargoSchema(montoOriginal), [montoOriginal]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoRecargo: "",
      valor: "",
    },
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  const tipoRecargo = watch("tipoRecargo");
  const valorWatch = watch("valor");
  const [saving, setSaving] = useState(false);

  const montoFinalRecargo = useMemo(() => {
    const tipo = tipoRecargo == null ? "" : String(tipoRecargo).trim();
    const v = parseValorRecargo(valorWatch);
    if (v == null || v <= 0 || !tipo) return null;
    if (tipo === "FIJO") return roundRecargoMonto(v);
    if (tipo === "PORCENTAJE") {
      if (montoOriginal <= 0) return null;
      return roundRecargoMonto((montoOriginal * v) / 100);
    }
    return null;
  }, [tipoRecargo, valorWatch, montoOriginal]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    reset({
      tipoRecargo: "",
      valor: "",
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
    const tipo = data.tipoRecargo;
    const raw = parseValorRecargo(data.valor);
    const montoRecargo =
      tipo === "FIJO"
        ? roundRecargoMonto(raw)
        : roundRecargoMonto((montoOriginal * raw) / 100);

    if (montoRecargo == null || montoRecargo <= 0) {
      setError("valor", {
        type: "manual",
        message: "El monto del recargo resultante debe ser mayor a 0",
      });
      return;
    }

    setSaving(true);
    try {
      await aplicarRecargoEnVenta(ventaId, {
        cuotaId: cuota.id,
        montoRecargo,
      });
      await Promise.resolve(onSuccess?.());
    } catch (err) {
      const { fieldErrors, generalMessage } = mapAplicarRecargoError(err);
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

  if (!open || !cuota) return null;

  const saldoPendiente = Number(cuota.saldoPendiente) || 0;
  const recargoActual = Number(cuota.montoRecargoManual) || 0;
  const exigible = cuota.montoTotalExigible ?? cuota.montoOriginal;
  const pctIngresado = parseValorRecargo(valorWatch);

  return (
    <div className="cclf-overlay" onClick={!saving ? handleCancel : undefined}>
      <div className="cclf-card cclf-card--recargo" onClick={(e) => e.stopPropagation()}>
        <div className="cclf-card__header">
          <div>
            <h2 className="cclf-card__title">Aplicar recargo</h2>
            <p className="vp-plan-form__subtitle-modal">Recargo manual por mora sobre cuota vencida</p>
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
            <form onSubmit={handleSubmit(onSubmit)} id="recargo-aplicar-form">
              {errors.root?.message ? (
                <div className="alert alert-danger mb-3" role="alert">
                  {errors.root.message}
                </div>
              ) : null}

              <div className="vp-plan-form__section vp-plan-form__section--modal-tight">
                <h6 className="vp-plan-form__subtitle">Cuota vencida</h6>
                <div className="vp-pago-contexto-cuota">
                  <div className="vp-pago-resumen__head">
                    <span className="vp-pago-resumen__nro">Cuota {cuota.numeroCuota}</span>
                    <span className="vp-pago-resumen__tipo">{cuota.tipoCuota ?? "—"}</span>
                    <span className="vp-pago-resumen__moneda">{moneda ?? "ARS"}</span>
                    <span className="vp-badge-cuota vp-badge--vencida">Vencida</span>
                  </div>
                  <div className="vp-pago-resumen__grid vp-pago-resumen__grid--recargo">
                    <div className="vp-pago-resumen__cell">
                      <span className="vp-pago-contexto-label">Vencimiento</span>
                      <span className="vp-pago-contexto-value">{fmtFecha(cuota.fechaVencimiento)}</span>
                    </div>
                    <div className="vp-pago-resumen__cell">
                      <span className="vp-pago-contexto-label">Monto original</span>
                      <span className="vp-pago-contexto-value">{fmtMonto(montoOriginal, moneda)}</span>
                    </div>
                    <div className="vp-pago-resumen__cell">
                      <span className="vp-pago-contexto-label">Recargo actual</span>
                      <span className="vp-pago-contexto-value">{fmtMonto(recargoActual, moneda)}</span>
                    </div>
                    <div className="vp-pago-resumen__cell">
                      <span className="vp-pago-contexto-label">Monto exigible</span>
                      <span className="vp-pago-contexto-value">{fmtMonto(exigible, moneda)}</span>
                    </div>
                    <div className="vp-pago-resumen__cell">
                      <span className="vp-pago-contexto-label">Pagado</span>
                      <span className="vp-pago-contexto-value">{fmtMonto(cuota.montoPagado, moneda)}</span>
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

              <div className="vp-plan-form__section vp-plan-form__section--modal-tight">
                <h6 className="vp-plan-form__subtitle">Detalle del recargo</h6>
                <div className="vp-recargo-form">
                  <div className="vp-recargo-form__row">
                    <div
                      className={`vp-recargo-field${errors.tipoRecargo ? " vp-recargo-field--error" : ""}`}
                      role="group"
                      aria-labelledby="recargo-lbl-tipo"
                    >
                      <div id="recargo-lbl-tipo" className="vp-recargo-field__label">
                        Tipo de recargo <span className="vp-recargo-field__req" aria-hidden="true">*</span>
                      </div>
                      <div className="vp-recargo-field__control">
                        <Controller
                          name="tipoRecargo"
                          control={control}
                          render={({ field: { onChange, value } }) => (
                            <NiceSelect
                              value={value ?? ""}
                              options={RECARGO_TIPO_OPTIONS}
                              placeholder="Elegir tipo"
                              showPlaceholderOption
                              usePortal
                              onChange={onChange}
                            />
                          )}
                        />
                      </div>
                      {errors.tipoRecargo ? (
                        <div className="vp-recargo-field__error">{errors.tipoRecargo.message}</div>
                      ) : null}
                    </div>

                    <div
                      className={`vp-recargo-field${errors.valor ? " vp-recargo-field--error" : ""}`}
                    >
                      <label className="vp-recargo-field__label" htmlFor="recargo-valor">
                        {tipoRecargo === "PORCENTAJE" ? "Porcentaje" : "Importe del recargo"}{" "}
                        <span className="vp-recargo-field__req" aria-hidden="true">*</span>
                      </label>
                      <div className="vp-recargo-field__control">
                        <input
                          id="recargo-valor"
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          autoComplete="off"
                          className={`field-input vp-input-monto${errors.valor ? " is-invalid" : ""}`}
                          placeholder={tipoRecargo === "PORCENTAJE" ? "Ej. 10" : "Ej. 1500"}
                          onWheel={(e) => e.currentTarget.blur()}
                          {...register("valor")}
                        />
                      </div>
                      {errors.valor ? <div className="vp-recargo-field__error">{errors.valor.message}</div> : null}
                    </div>
                  </div>

                  {montoFinalRecargo != null && montoFinalRecargo > 0 ? (
                    <div className="vp-recargo-result" role="status">
                      <div className="vp-recargo-result__head">
                        <span className="vp-recargo-result__kicker">A aplicar ahora</span>
                        <span className="vp-recargo-result__amount">
                          {fmtMonto(montoFinalRecargo, moneda)}
                        </span>
                      </div>
                      {tipoRecargo === "PORCENTAJE" &&
                      pctIngresado != null &&
                      pctIngresado > 0 &&
                      montoOriginal > 0 ? (
                        <p className="vp-recargo-result__formula">
                          {pctIngresado}% sobre {fmtMonto(montoOriginal, moneda)}
                        </p>
                      ) : tipoRecargo === "FIJO" ? (
                        <p className="vp-recargo-result__formula">Monto fijo</p>
                      ) : null}
                      <div className="vp-recargo-result__stack">
                        <div className="vp-recargo-result__row">
                          <span className="vp-recargo-result__row-label">Recargo ya registrado</span>
                          <span className="vp-recargo-result__row-value">{fmtMonto(recargoActual, moneda)}</span>
                        </div>
                        <div className="vp-recargo-result__row vp-recargo-result__row--emphasis">
                          <span className="vp-recargo-result__row-label">Recargo acumulado luego de aplicar</span>
                          <span className="vp-recargo-result__row-value">
                            {fmtMonto(recargoActual + montoFinalRecargo, moneda)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </form>
          </div>

          <div className="cclf-footer vp-plan-form__footer vp-recargo-footer">
            <button
              className="btn btn-outline vp-recargo-footer__cancel"
              type="button"
              onClick={handleCancel}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              form="recargo-aplicar-form"
              disabled={saving}
            >
              {saving ? "Aplicando…" : "Aplicar recargo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
