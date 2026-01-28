// src/components/Cards/Lotes/PromocionCard.jsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import EliminarBase from "../Base/EliminarBase.jsx";
import "../Base/cards.css";
import { aplicarPromocionSchema } from "../../../lib/validations/promocion.schema.js";
import { aplicarPromocion, quitarPromocion, getPromocionActiva } from "../../../lib/api/lotes.js";
import { fmtMoney } from "../../../components/Table/TablaLotes/utils/formatters";

function toDateInputValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  // Formato DD/MM/YYYY
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function PromocionCard({
  open,
  onCancel,
  onCreated,
  lote,
  modo = "aplicar", // "aplicar" o "ver" (en promoción)
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [openQuitar, setOpenQuitar] = useState(false);
  const [quitarLoading, setQuitarLoading] = useState(false);
  const [promocionActiva, setPromocionActiva] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm({
    resolver: zodResolver(aplicarPromocionSchema),
    defaultValues: {
      precioPromocional: "",
      fin: "",
      explicacion: "",
      sinFechaFin: true,
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const sinFechaFin = watch("sinFechaFin");
  const precioPromocional = watch("precioPromocional");

  // Cargar promoción activa al abrir en modo "ver"
  useEffect(() => {
    if (!open || modo !== "ver" || !lote?.id) {
      setPromocionActiva(null);
      return;
    }
    
    const loadPromocion = async () => {
      try {
        const response = await getPromocionActiva(lote.id);
        setPromocionActiva(response?.data || null);
      } catch (err) {
        // Si no hay promoción activa (404), es válido
        if (err?.statusCode === 404 || err?.response?.status === 404) {
          setPromocionActiva(null);
        } else {
          console.error("Error al cargar promoción activa:", err);
          setPromocionActiva(null);
        }
      }
    };
    
    loadPromocion();
  }, [open, modo, lote?.id]);

  // Resetear formulario al abrir/cerrar (pero NO resetear showSuccess si está activo)
  useEffect(() => {
    if (!open && !showSuccess) {
      reset({
        precioPromocional: "",
        fin: "",
        explicacion: "",
        sinFechaFin: true,
      });
      setError(null);
      setOpenQuitar(false);
      setPromocionActiva(null);
      setSuccessMessage("");
    }
  }, [open, showSuccess, reset]);

  // Cuando cambia sinFechaFin, limpiar fin si está activo
  useEffect(() => {
    if (sinFechaFin) {
      setValue("fin", "");
    }
  }, [sinFechaFin, setValue]);

  const onSubmit = async (data) => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        precioPromocional: data.precioPromocional,
        fin: data.sinFechaFin || !data.fin ? null : new Date(`${data.fin}T12:00:00.000Z`).toISOString(),
        explicacion: data.explicacion || null,
      };

      const response = await aplicarPromocion(lote.id, payload);
      
      setSuccessMessage("¡Promoción aplicada exitosamente!");
      setShowSuccess(true);
      onCreated?.(response?.data);
      
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage("");
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || "Error al aplicar promoción";
      setError(errorMessage);
      setSaving(false);
    }
  };

  const handleQuitarPromocion = async () => {
    setQuitarLoading(true);
    setError(null);

    try {
      await quitarPromocion(lote.id);
      
      setOpenQuitar(false);
      setSuccessMessage("¡Promoción quitada exitosamente!");
      setShowSuccess(true);
      onCreated?.();
      
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage("");
        setQuitarLoading(false);
        onCancel?.();
      }, 1500);
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || "Error al quitar promoción";
      setError(errorMessage);
      setQuitarLoading(false);
    }
  };

  // Renderizar animación incluso si el modal se está cerrando
  if (!open && !showSuccess) return null;

  // Modo "ver" (en promoción)
  if (modo === "ver") {
    return (
      <>
        {/* Animación de éxito - se muestra incluso si open es false */}
        <SuccessAnimation show={showSuccess} message={successMessage || "¡Promoción quitada exitosamente!"} />

        {open && !showSuccess && (
          <div className="cclf-overlay" onClick={!quitarLoading ? onCancel : undefined}>
            <div
              className="cclf-card"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="cclf-card__header">
              <h2 className="cclf-card__title">Promoción Activa</h2>
              <div className="cclf-card__actions">
                <button
                  type="button"
                  className="cclf-btn-close"
                  onClick={() => {
                    if (showSuccess) return;
                    onCancel?.();
                  }}
                  aria-label="Cerrar"
                  disabled={quitarLoading}
                >
                  <span className="cclf-btn-close__x">×</span>
                </button>
              </div>
            </div>

            <div className="cclf-card__body">
              <div className="venta-grid" style={{ ["--sale-label-w"]: "200px" }}>
                {error && (
                  <div className="promocion-field-full promocion-error-message">
                    {error}
                  </div>
                )}

                {promocionActiva ? (
                  <>
                    {/* Fila 1: Precio anterior | Precio promocional */}
                    <div className="field-row">
                      <div className="field-label">PRECIO ANTERIOR</div>
                      <div className="field-value is-readonly">
                        {fmtMoney(promocionActiva.precioAnterior)}
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field-label">PRECIO PROMOCIONAL</div>
                      <div className="field-value is-readonly promocion-precio-actual">
                        {fmtMoney(promocionActiva.precioPromocional)}
                      </div>
                    </div>
                    {/* Fila 2: Inicio | Fin */}
                    <div className="field-row">
                      <div className="field-label">INICIO</div>
                      <div className="field-value is-readonly">
                        {formatDate(promocionActiva.inicio)}
                      </div>
                    </div>
                    <div className="field-row">
                      <div className="field-label">FIN</div>
                      <div className="field-value is-readonly">
                        {promocionActiva.fin ? formatDate(promocionActiva.fin) : "Sin fecha de fin"}
                      </div>
                    </div>
                    {/* Fila 3: Explicación (full width) */}
                    {promocionActiva.explicacion && (
                      <div className="field-row promocion-field-full">
                        <div className="field-label">EXPLICACIÓN</div>
                        <div className="field-value is-readonly promocion-explicacion-readonly">
                          {promocionActiva.explicacion}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ gridColumn: "1 / -1", padding: 24, textAlign: "center", color: "#6b7280" }}>
                    Cargando información de la promoción...
                  </div>
                )}
              </div>
            </div>

            {/* Footer con botón Quitar */}
            {promocionActiva && (
              <div className="cclf-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    if (showSuccess) return;
                    onCancel?.();
                  }}
                  disabled={quitarLoading}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setOpenQuitar(true)}
                  disabled={quitarLoading}
                >
                  {quitarLoading ? "Quitando..." : "Quitar Promoción"}
                </button>
              </div>
            )}
            </div>
          </div>
        )}

        <EliminarBase
          open={openQuitar}
          title="Quitar Promoción"
          message="¿Confirmás que querés quitar la promoción de este lote?"
          details={[
            `Lote: Lote ${lote?.fraccion.numero}-${lote?.numero}`,
            `Precio actual: ${fmtMoney(promocionActiva?.precioPromocional)}`,
            `Se revertirá a: ${fmtMoney(promocionActiva?.precioAnterior)}`,
          ]}
          noteBold="El lote volverá a su precio y estado anterior."
          confirmLabel="Quitar Promoción"
          loading={quitarLoading}
          onConfirm={handleQuitarPromocion}
          onCancel={() => setOpenQuitar(false)}
        />
      </>
    );
  }

  // Modo "aplicar"
  return (
    <>
      {/* Animación de éxito - se muestra incluso si open es false */}
      <SuccessAnimation show={showSuccess} message={successMessage || "¡Promoción aplicada exitosamente!"} />

      <EditarBase
        open={open}
        title="Aplicar Promoción"
        onCancel={() => {
          if (showSuccess) return;
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        saveButtonText={saving ? "Aplicando..." : "Aplicar Promoción"}
        onSave={handleSubmit(onSubmit)}
        saving={saving}
      >
        <div className="promocion-grid" style={{ ["--sale-label-w"]: "200px" }}>
          {error && (
            <div className="promocion-field-full promocion-error-message">
              {error}
            </div>
          )}

          {/* Fila 1: Precio promocional | Precio actual */}
          <div className={`fieldRow ${errors.precioPromocional ? "hasError" : ""}`}>
            <div className="field-row">
              <div className="field-label">PRECIO PROMOCIONAL *</div>
              <div className="field-value p0">
                <input
                  {...register("precioPromocional", { valueAsNumber: true })}
                  className={`field-input ${errors.precioPromocional ? "is-invalid" : ""}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="10"
                  placeholder="$ "
                />
              </div>
            </div>
            {errors.precioPromocional && (
              <div className="fieldError">{errors.precioPromocional.message}</div>
            )}
          </div>

          {lote?.precio && (
            <div className="field-row">
              <div className="field-label">PRECIO ACTUAL</div>
              <div className="field-value is-readonly">
                {fmtMoney(lote.precio)}
              </div>
            </div>
          )}

          {/* Fila 2: Duración | Fecha fin */}
          <div className={`fieldRow ${errors.sinFechaFin || errors.fin ? "hasError" : ""}`}>
            <div className="field-row">
              <div className="field-label">DURACIÓN</div>
              <div className="field-value p0">
                <div className="promoCheckRow">
                  <label htmlFor="sinFechaFin">Sin fecha de fin</label>
                  <input
                    type="checkbox"
                    {...register("sinFechaFin")}
                    id="sinFechaFin"
                  />
                </div>
              </div>
            </div>
            {errors.sinFechaFin && (
              <div className="fieldError">{errors.sinFechaFin.message}</div>
            )}
          </div>

          {!sinFechaFin && (
            <div className={`fieldRow ${errors.fin ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">FECHA DE FIN</div>
                <div className="field-value p0">
                  <input
                    {...register("fin")}
                    className={`field-input ${errors.fin ? "is-invalid" : ""}`}
                    type="date"
                    min={toDateInputValue(new Date(Date.now() + 86400000))}
                  />
                </div>
              </div>
              {errors.fin && (
                <div className="fieldError">{errors.fin.message}</div>
              )}
            </div>
          )}

          {/* Fila 3: Explicación (full width) */}
          <div className={`fieldRow promocion-field-full promocion-explicacion-row ${errors.explicacion ? "hasError" : ""}`}>
            <div className="field-row promocion-explicacion-row-inner">
              <div className="field-label">Motivo</div>
              <div className="field-value p0">
                <textarea
                  {...register("explicacion")}
                  className={`field-input promocion-textarea ${errors.explicacion ? "is-invalid" : ""}`}
                  rows={4}
                  placeholder="Opcional: descripción de la promoción"
                />
              </div>
            </div>
            {errors.explicacion && (
              <div className="fieldError">{errors.explicacion.message}</div>
            )}
          </div>
        </div>
      </EditarBase>
    </>
  );
}