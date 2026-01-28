// src/components/Inmobiliarias/InmobiliariaEditarCard.jsx
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import { updateInmobiliaria, getInmobiliariaById } from "../../../lib/api/inmobiliarias.js";
import { isEliminado } from "../../../utils/estadoOperativo";
import { useAuth } from "../../../app/providers/AuthProvider";
import { inmobiliariaCreateSchema } from "../../../lib/validations/inmobiliariaCreate.schema.js";

export default function InmobiliariaEditarCard({
  open,
  inmobiliaria,              // opcional: si viene completa, se usa
  inmobiliariaId,            // opcional: si viene id, se hace GET
  inmobiliarias,             // opcional: lista cache para buscar por id
  onCancel,
  onSaved,
  entityType = "Inmobiliaria", // tipo de entidad para el mensaje de éxito
}) {
  const [detalle, setDetalle] = useState(inmobiliaria || null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // ancho de label como en VerCard
  const [labelW, setLabelW] = useState(180);
  const containerRef = useRef(null);

  // Obtener rol del usuario
  const { user } = useAuth();
  const isAdminOrGestor = user?.role === 'ADMINISTRADOR' || user?.role === 'GESTOR';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inmobiliariaCreateSchema),
    defaultValues: {
      nombre: "",
      razonSocial: "",
      contacto: "",
      comxventa: "",
      maxPrioridadesActivas: "",
    },
  });

  /* 2) GET de inmobiliaria al abrir y cuando cambia la prop inmobiliaria */
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) return;

      // Si viene inmobiliaria por props, usarla (esto se ejecuta también cuando inmobiliaria cambia)
      if (inmobiliaria) { 
        setDetalle(inmobiliaria); 
        return; 
      }

      if (inmobiliariaId != null && Array.isArray(inmobiliarias)) {
        const found = inmobiliarias.find(i => `${i.id}` === `${inmobiliariaId}`);
        if (found) { 
          setDetalle(found); 
          return; 
        }
      }

      if (inmobiliariaId != null) {
        try {
          const response = await getInmobiliariaById(inmobiliariaId);
          const full = response?.data ?? response;
          if (!abort && full) setDetalle(full);
        } catch (e) {
          console.error("Error obteniendo inmobiliaria por id:", e);
        }
      }
    }
    run();
    return () => { abort = true; };
  }, [open, inmobiliariaId, inmobiliarias, inmobiliaria]);

  /* 3) Resetear estados y form cuando el modal se cierra o se abre con otra inmobiliaria */
  useEffect(() => {
    if (!open) {
      setSaving(false);
      setShowSuccess(false);
    } 
  }, [open]);

  // Sync form with detalle
  useEffect(() => {
    if (open && detalle) {
      reset({
        nombre: detalle.nombre ?? "",
        razonSocial: detalle.razonSocial ?? "",
        contacto: detalle.contacto ?? "",
        comxventa: detalle.comxventa != null ? String(detalle.comxventa) : "",
        maxPrioridadesActivas: detalle.maxPrioridadesActivas != null ? String(detalle.maxPrioridadesActivas) : "",
      });
    }
  }, [open, detalle, reset]);

  /* 5) ancho de label como en VerCard */
  useEffect(() => {
    const labels = [
      "NOMBRE", "RAZÓN SOCIAL", "CONTACTO", "COMISIÓN X VENTA", "LÍMITE PRIORIDADES ACTIVAS",
      "FECHA DE ACTUALIZACIÓN", "FECHA DE CREACIÓN"
    ];
    const longest = Math.max(...labels.map(s => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, detalle?.id]);

  /* 6) Guardado (PATCH minimal y validado) */
  function buildPatch(data) {
    const patch = {};

    const initialRazonSocial = detalle?.razonSocial ?? "";
    if (data.razonSocial !== initialRazonSocial) {
      patch.razonSocial = data.razonSocial.trim();
    }

    const initialContacto = detalle?.contacto ?? "";
    const currentContacto = data.contacto ?? "";
    if (currentContacto !== initialContacto) {
      patch.contacto = currentContacto.trim() || null;
    }

    const initialComxventa = detalle?.comxventa != null ? String(detalle.comxventa) : "";
    const currentComxventa = data.comxventa;
    if (currentComxventa !== initialComxventa) {
       // El schema ya validó que es numero o undefined/null
       // Pero data.comxventa viene del input como string (si usamos register sin valueAsNumber) o numero
       // Si el inputType es number, react hook form intenta convertir
       const num = currentComxventa === "" ? null : Number(currentComxventa);
       if (num !== null && !isNaN(num)) {
          patch.comxventa = num;
       } else if (num === null) {
          patch.comxventa = null;
       }
    }

    // maxPrioridadesActivas - solo Admin/Gestor puede editar
    if (isAdminOrGestor) {
      const initialMax = detalle?.maxPrioridadesActivas != null ? String(detalle.maxPrioridadesActivas) : "";
      const currentMax = data.maxPrioridadesActivas;
      if (currentMax !== initialMax) {
          const num = currentMax === "" ? null : Number(currentMax);
          if (num !== null && !isNaN(num)) {
             patch.maxPrioridadesActivas = Math.floor(num);
          } else if (num === null) {
             patch.maxPrioridadesActivas = null;
          }
      }
    }

    return patch;
  }

  const onSubmit = async (data) => {
    // Bloquear submit si está eliminado
    if (isEliminado(detalle)) {
      return;
    }

    try {
      setSaving(true);
      const patch = buildPatch(data);
      
      if (Object.keys(patch).length === 0) { 
        setSaving(false);
        onCancel?.(); 
        return; 
      }
      
      const response = await updateInmobiliaria(detalle.id, patch);
      const updated = response?.data ?? response;
      
      setDetalle(updated);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onSaved?.(updated);
        onCancel?.();
      }, 1500);
    } catch (e) {
      console.error("Error guardando inmobiliaria:", e);
      setSaving(false);
      alert(e?.message || "No se pudo guardar la inmobiliaria.");
    }
  };

  function handleReset() {
     if (detalle) {
        reset({
            nombre: detalle.nombre ?? "",
            razonSocial: detalle.razonSocial ?? "",
            contacto: detalle.contacto ?? "",
            comxventa: detalle.comxventa != null ? String(detalle.comxventa) : "",
            maxPrioridadesActivas: detalle.maxPrioridadesActivas != null ? String(detalle.maxPrioridadesActivas) : "",
        });
     }
  }

  if (!open || !detalle) return null;

  const eliminado = isEliminado(detalle);

  // Fechas (solo lectura)
  const fechaActISO = detalle?.updateAt ?? detalle?.updatedAt ?? detalle?.fechaActualizacion;
  const fechaCreISO = detalle?.createdAt ?? detalle?.fechaCreacion;
  const fechaAct = fechaActISO ? new Date(fechaActISO).toLocaleDateString("es-AR") : "Sin información";
  const fechaCre = fechaCreISO ? new Date(fechaCreISO).toLocaleDateString("es-AR") : "Sin información";

  return (
    <>
      <SuccessAnimation show={showSuccess} message={`¡${entityType} guardada exitosamente!`} />

      <EditarBase
        open={open}
        title={`${detalle?.nombre ?? "—"}`}
        onCancel={() => {
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        onSave={eliminado ? undefined : handleSubmit(onSubmit)}
        onReset={handleReset}
        saving={saving}
      >
        <div style={{ "--sale-label-w": `${labelW}px` }}>
          {eliminado && (
            <div style={{
              background: '#FEF3C7',
              border: '1px solid #F59E0B',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#92400E',
              fontWeight: 500
            }}>
              Inmobiliaria eliminada - solo lectura
            </div>
          )}
          <h3 className="venta-section-title">Información de la inmobiliaria</h3>

          <div className="venta-grid" ref={containerRef}>
            {/* Columna izquierda */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">NOMBRE</div>
                <div className="field-value is-readonly">{detalle.nombre || "Sin información"}</div>
              </div>

              <div className={`fieldRow ${errors.razonSocial ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">RAZÓN SOCIAL</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${errors.razonSocial ? "is-invalid" : ""}`}
                      type="text"
                      placeholder="Razón social"
                      disabled={eliminado}
                      {...register("razonSocial")}
                    />
                  </div>
                </div>
                 {errors.razonSocial && <div className="fieldError">{errors.razonSocial.message}</div>}
              </div>

              <div className={`fieldRow ${errors.contacto ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">CONTACTO</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${errors.contacto ? "is-invalid" : ""}`}
                      type="text"
                      placeholder="Teléfono o email"
                      disabled={eliminado}
                      {...register("contacto")}
                    />
                  </div>
                </div>
                {errors.contacto && <div className="fieldError">{errors.contacto.message}</div>}
              </div>

              <div className={`fieldRow ${errors.comxventa ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">COMISIÓN X VENTA</div>
                  <div className="field-value p0" style={{ position: "relative" }}>
                    <input
                      className={`field-input ${errors.comxventa ? "is-invalid" : ""}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      style={{ paddingRight: "50px" }}
                      disabled={eliminado}
                      {...register("comxventa")}
                    />
                     {/* comxventa value visual helper could be managed, but register handles value */}
                    <span style={{ 
                      position: "absolute", 
                      right: "12px", 
                      top: "50%", 
                      transform: "translateY(-50%)",
                      color: "#6B7280",
                      fontSize: "13px",
                      pointerEvents: "none",
                      fontWeight: 500
                    }}>
                      %
                    </span>
                  </div>
                </div>
                {errors.comxventa && <div className="fieldError">{errors.comxventa.message}</div>}
              </div>
            </div>

            {/* Columna derecha */}
            <div className="venta-col">
              {/* Estado (solo lectura) */}
              <div className="field-row">
                <div className="field-label">ESTADO</div>
                <div className="field-value is-readonly">
                  {detalle?.estado === 'ELIMINADO' ? 'ELIMINADO' : 'OPERATIVO'}
                </div>
              </div>

              {/* Fecha de baja (solo si está eliminada) */}
              {detalle?.fechaBaja && (
                <div className="field-row">
                  <div className="field-label" style={{ color: '#ef4444' }}>FECHA DE BAJA</div>
                  <div className="field-value is-readonly" style={{ color: '#ef4444' }}>
                    {new Date(detalle.fechaBaja).toLocaleDateString("es-AR")}
                  </div>
                </div>
              )}

              <div className="field-row">
                <div className="field-label">FECHA DE ACTUALIZACIÓN</div>
                <div className="field-value is-readonly">{fechaAct}</div>
              </div>

              <div className="field-row">
                <div className="field-label">FECHA DE CREACIÓN</div>
                <div className="field-value is-readonly">{fechaCre}</div>
              </div>

              {/* Campo maxPrioridadesActivas - solo visible para Admin/Gestor */}
              {isAdminOrGestor && (
                <div className={`fieldRow ${errors.maxPrioridadesActivas ? "hasError" : ""}`}>
                  <div className="field-row">
                    <div className="field-label">LÍMITE PRIORIDADES ACTIVAS</div>
                    <div className="field-value p0">
                      <input
                        className={`field-input ${errors.maxPrioridadesActivas ? "is-invalid" : ""}`}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        placeholder="Sin límite"
                        disabled={eliminado}
                        {...register("maxPrioridadesActivas")}
                      />
                    </div>
                  </div>
                  {errors.maxPrioridadesActivas && <div className="fieldError">{errors.maxPrioridadesActivas.message}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </EditarBase>
    </>
  );
}

