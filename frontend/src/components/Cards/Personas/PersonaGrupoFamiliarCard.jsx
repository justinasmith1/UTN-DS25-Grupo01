import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import "../Base/cards.css";
import "../../Table/TablaLotes/TablaLotes.css";
import EliminarBase from "../Base/EliminarBase.jsx";
import { getGrupoFamiliar, crearMiembroFamiliar, eliminarMiembroFamiliar } from "../../../lib/api/personas.js";

// Schema para crear miembro familiar (solo campos mínimos)
const miembroFamiliarSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede tener más de 100 caracteres"),
  apellido: z.string().min(1, "El apellido es requerido").max(100, "El apellido no puede tener más de 100 caracteres"),
  identificadorTipo: z
    .string({
      required_error: "Debe seleccionar un identificador",
      invalid_type_error: "Debe seleccionar un identificador",
    })
    .refine((val) => val !== "" && val !== null && val !== undefined, {
      message: "Debe seleccionar un identificador",
    })
    .refine((val) => ["DNI", "CUIT", "CUIL", "PASAPORTE", "OTRO"].includes(val), {
      message: "Debe seleccionar un identificador",
    }),
  identificadorValor: z.string().min(1, "El valor del identificador es requerido"),
}).refine(
  (data) => {
    // Validar formato básico según tipo
    const valor = data.identificadorValor.trim();
    if (data.identificadorTipo === "DNI") {
      return /^\d{8}$/.test(valor);
    }
    if (data.identificadorTipo === "CUIT" || data.identificadorTipo === "CUIL") {
      return /^\d{11}$/.test(valor.replace(/-/g, ""));
    }
    if (data.identificadorTipo === "PASAPORTE") {
      return /^[A-Z0-9]{6,9}$/.test(valor);
    }
    return valor.length > 0;
  },
  {
    message: "Valor de identificador no coincide con el tipo especificado",
    path: ["identificadorValor"],
  }
);

const TIPOS_IDENTIFICADOR = [
  { value: "DNI", label: "DNI" },
  { value: "CUIL", label: "CUIL" },
  { value: "CUIT", label: "CUIT" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
];

// NiceSelect component (copiado de PersonaCrearCard para evitar dependencias)
function NiceSelect({ value, options, placeholder = "Seleccionar", onChange, usePortal = false }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (open && usePortal && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom, left: rect.left });
    }
  }, [open, usePortal]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (!btnRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const label = options.find(o => `${o.value}` === `${value}`)?.label ?? placeholder;

  const menuContent = open ? (
    <ul 
      ref={listRef} 
      className="ns-list" 
      role="listbox" 
      tabIndex={-1}
      style={usePortal ? {
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: '233px',
        zIndex: 10000,
        maxHeight: '300px',
        overflowY: 'auto',
        backgroundColor: '#fff',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        margin: 0,
        padding: 0,
        listStyle: 'none'
      } : {}}
    >
      {options.map(opt => (
        <li
          key={`${opt.value}::${opt.label}`}
          role="option"
          aria-selected={`${opt.value}` === `${value}`}
          className={`ns-item ${`${opt.value}` === `${value}` ? "is-active" : ""}`}
          onClick={() => {
            onChange?.(opt.value || "");
            setOpen(false);
          }}
        >
          {opt.label}
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div className="ns-wrap" style={{ position: "relative" }}>
      <button
        type="button"
        ref={btnRef}
        className="ns-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 20 20" 
          aria-hidden
          style={{ marginLeft: '8px', flexShrink: 0 }}
        >
          <polyline points="5,7 10,12 15,7" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {usePortal && typeof document !== 'undefined' 
        ? createPortal(menuContent, document.body)
        : menuContent
      }
    </div>
  );
}

export default function PersonaGrupoFamiliarCard({
  open,
  onCancel,
  persona,
}) {
  const [grupoFamiliar, setGrupoFamiliar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAgregarForm, setShowAgregarForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmEliminar, setConfirmEliminar] = useState(null); // { miembroId, miembroNombre }
  const [removingId, setRemovingId] = useState(null); // Para animación de fade-out

  // Helper para cerrar el modal
  const handleClose = () => {
    if (showSuccess) return;
    setShowAgregarForm(false);
    setError(null);
    onCancel?.();
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(miembroFamiliarSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      identificadorTipo: "",
      identificadorValor: "",
    },
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const identificadorTipo = watch("identificadorTipo");

  // Cargar grupo familiar al abrir
  useEffect(() => {
    if (!open || !persona?.id) {
      setGrupoFamiliar(null);
      setError(null);
      setShowAgregarForm(false);
      return;
    }

    setLoading(true);
    setError(null);
    getGrupoFamiliar(persona.id)
      .then((data) => {
        setGrupoFamiliar(data);
      })
      .catch((err) => {
        setError(err?.message || "Error al cargar grupo familiar");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, persona?.id]);

  const onSubmitMiembro = async (data) => {
    setError(null);
    setSaving(true);
    try {
      const miembro = await crearMiembroFamiliar(persona.id, data);
      
      // Refrescar grupo familiar
      const updated = await getGrupoFamiliar(persona.id);
      setGrupoFamiliar(updated);
      
      // Resetear form y ocultar
      reset();
      setShowAgregarForm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (err) {
      setError(err?.message || "Error al crear miembro familiar");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarClick = (miembro) => {
    setConfirmEliminar({
      miembroId: miembro.id,
      miembroNombre: getDisplayName(miembro),
    });
  };

  const handleConfirmarEliminar = async () => {
    if (!confirmEliminar) return;

    const { miembroId } = confirmEliminar;
    setConfirmEliminar(null);
    setRemovingId(miembroId); // Iniciar animación de fade-out
    setEliminandoId(miembroId);
    setError(null);

    // Actualización optimista: remover del array inmediatamente
    const miembroOriginal = grupoFamiliar.miembros.find(m => m.id === miembroId);
    setGrupoFamiliar(prev => ({
      ...prev,
      miembros: prev.miembros.filter(m => m.id !== miembroId),
    }));

    try {
      await eliminarMiembroFamiliar(persona.id, miembroId);
      
      // Refrescar grupo familiar en background (sin bloquear UI)
      getGrupoFamiliar(persona.id)
        .then((updated) => {
          setGrupoFamiliar(updated);
        })
        .catch(() => {
          // Si falla el refetch, ya removimos optimísticamente, está bien
        });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (err) {
      // Revertir actualización optimista en caso de error
      if (miembroOriginal) {
        setGrupoFamiliar(prev => ({
          ...prev,
          miembros: [...prev.miembros, miembroOriginal].sort((a, b) => a.id - b.id),
        }));
      }
      setError(err?.message || "Error al eliminar miembro familiar");
    } finally {
      setEliminandoId(null);
      // Limpiar removingId después de la animación
      setTimeout(() => setRemovingId(null), 300);
    }
  };

  const getDisplayName = (persona) => {
    if (persona?.razonSocial) return persona.razonSocial;
    return `${persona?.nombre || ""} ${persona?.apellido || ""}`.trim() || "—";
  };

  if (!open || !persona) return null;

  return (
    <>
      <div className="cclf-overlay" onClick={handleClose}>
      <div
        className="cclf-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "900px", width: "92vw" }}
      >
        {/* Header */}
        <div className="cclf-card__header">
          <h2 className="cclf-card__title">Grupo Familiar</h2>
          <div className="cclf-card__actions">
            <button
              type="button"
              className="cclf-btn-close"
              onClick={handleClose}
              aria-label="Cerrar"
            >
              <span className="cclf-btn-close__x">×</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="cclf-card__body">
          <div
            style={{
              maxWidth: "900px",
              width: "100%",
              margin: "0 auto",
              padding: "0 16px",
            }}
          >
        {loading && (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner-border" role="status" />
            <p style={{ marginTop: "16px" }}>Cargando grupo familiar...</p>
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              padding: "12px",
              background: "#fee",
              border: "1px solid #fcc",
              borderRadius: "8px",
              marginBottom: "16px",
              color: "#c33",
            }}
          >
            {error}
          </div>
        )}

        {showSuccess && (
          <div className="success-animation-overlay">
            <div className="success-animation-card">
              <div className="success-checkmark">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="success-message">¡Operación exitosa!</p>
            </div>
          </div>
        )}

        {!loading && grupoFamiliar && (
          <>
            {/* Titular */}
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
                Titular
              </h3>
              <div className="field-row">
                <div className="field-label">NOMBRE COMPLETO</div>
                <div className="field-value is-readonly">
                  {getDisplayName(grupoFamiliar.titular)}
                </div>
              </div>
              <div className="field-row" style={{ marginTop: "12px" }}>
                <div className="field-label">IDENTIFICADOR</div>
                <div className="field-value is-readonly">
                  {grupoFamiliar.titular?.identificadorTipo} {grupoFamiliar.titular?.identificadorValor}
                </div>
              </div>
            </div>

            {/* Miembros */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600" }}>
                  Miembros ({grupoFamiliar.miembros?.length || 0})
                </h3>
                {!showAgregarForm && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAgregarForm(true)}
                    style={{ padding: "8px 16px", fontSize: "14px" }}
                  >
                    + Agregar Miembro
                  </button>
                )}
              </div>

              {showAgregarForm && (
                <div
                  style={{
                    padding: "16px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "16px" }}>
                    Nuevo Miembro
                  </h4>
                  <form onSubmit={handleSubmit(onSubmitMiembro)}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "16px",
                      }}
                    >
                      <div className={`fieldRow ${errors.nombre ? "hasError" : ""}`}>
                        <div className="field-row">
                          <div className="field-label">NOMBRE *</div>
                          <div className="field-value p0">
                            <input
                              type="text"
                              className="field-input"
                              {...register("nombre")}
                            />
                          </div>
                        </div>
                        {errors.nombre && (
                          <div className="fieldError">{errors.nombre.message}</div>
                        )}
                      </div>

                      <div className={`fieldRow ${errors.apellido ? "hasError" : ""}`}>
                        <div className="field-row">
                          <div className="field-label">APELLIDO *</div>
                          <div className="field-value p0">
                            <input
                              type="text"
                              className="field-input"
                              {...register("apellido")}
                            />
                          </div>
                        </div>
                        {errors.apellido && (
                          <div className="fieldError">{errors.apellido.message}</div>
                        )}
                      </div>

                      <div className={`fieldRow ${errors.identificadorTipo ? "hasError" : ""}`}>
                        <div className="field-row">
                          <div className="field-label">TIPO IDENTIFICADOR *</div>
                          <div className="field-value p0">
                            <NiceSelect
                              value={identificadorTipo || ""}
                              options={TIPOS_IDENTIFICADOR}
                              placeholder="Seleccionar"
                              onChange={(val) => setValue("identificadorTipo", val)}
                              usePortal={true}
                            />
                          </div>
                        </div>
                        {errors.identificadorTipo && (
                          <div className="fieldError">{errors.identificadorTipo.message}</div>
                        )}
                      </div>

                      <div className={`fieldRow ${errors.identificadorValor ? "hasError" : ""}`}>
                        <div className="field-row">
                          <div className="field-label">IDENTIFICADOR *</div>
                          <div className="field-value p0">
                            <input
                              type="text"
                              className="field-input"
                              {...register("identificadorValor")}
                            />
                          </div>
                        </div>
                        {errors.identificadorValor && (
                          <div className="fieldError">{errors.identificadorValor.message}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                        style={{ padding: "6px 12px", fontSize: "13px" }}
                      >
                        {saving ? "Creando..." : "Agregar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => {
                          reset();
                          setShowAgregarForm(false);
                          setError(null);
                        }}
                        disabled={saving}
                        style={{ padding: "6px 12px", fontSize: "13px" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {grupoFamiliar.miembros && grupoFamiliar.miembros.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {grupoFamiliar.miembros.map((miembro) => (
                    <div
                      key={miembro.id}
                      className={removingId === miembro.id ? "miembro-removing" : ""}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "500" }}>
                          {getDisplayName(miembro)}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                          {miembro.identificadorTipo} {miembro.identificadorValor}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="tl-icon tl-icon--delete"
                        onClick={() => handleEliminarClick(miembro)}
                        disabled={eliminandoId === miembro.id || removingId === miembro.id}
                        aria-label="Eliminar miembro"
                        data-tooltip="Eliminar miembro"
                      >
                        {eliminandoId === miembro.id ? (
                          <div
                            className="spinner-border spinner-border-sm"
                            role="status"
                            style={{ width: "18px", height: "18px", borderWidth: "2px" }}
                          >
                            <span className="visually-hidden">Eliminando...</span>
                          </div>
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
                  No hay miembros en el grupo familiar
                </div>
              )}
            </div>
          </>
        )}
          </div>
        </div>
      </div>
      </div>

      {/* Modal de confirmación para eliminar miembro */}
      {confirmEliminar && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
          <EliminarBase
            open={!!confirmEliminar}
            title="Eliminar miembro"
            message="¿Seguro que deseas eliminar este miembro del grupo familiar?"
            confirmLabel="Eliminar"
            loading={eliminandoId === confirmEliminar?.miembroId}
            onCancel={() => setConfirmEliminar(null)}
            onConfirm={handleConfirmarEliminar}
          />
        </div>,
        document.body
      )}
    </>
  );
}

