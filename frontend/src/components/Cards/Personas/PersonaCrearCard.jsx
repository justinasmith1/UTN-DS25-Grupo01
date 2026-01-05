import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import EditarBase from "../Base/EditarBase.jsx";
import { createPersona } from "../../../lib/api/personas.js";
import { getAllInmobiliarias, getInmobiliariaById } from "../../../lib/api/inmobiliarias.js";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
import { personaCreateSchema } from "../../../lib/validations/personaCreate.schema.js";

/* ----------------------- Select custom sin librerías ----------------------- */
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

  // Renderizar menú
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

const TIPOS_IDENTIFICADOR = [
  { value: "DNI", label: "DNI" },
  { value: "CUIL", label: "CUIL" },
  { value: "CUIT", label: "CUIT" },
  { value: "PASAPORTE", label: "Pasaporte" },
  { value: "OTRO", label: "Otro" },
];

const buildInitialForm = () => {
  return {
    identificadorTipo: "",
    identificadorValor: "",
    nombre: "",
    apellido: "",
    razonSocial: "",
    telefono: "",
    email: "",
  };
};

export default function PersonaCrearCard({
  open,
  onCancel,
  onCreated,
}) {
  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  const isAdminOrGestor = userRole === "ADMINISTRADOR" || userRole === "GESTOR";
  const isInmobiliaria = userRole === "INMOBILIARIA";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [loadingInmobiliarias, setLoadingInmobiliarias] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [tipoPersona, setTipoPersona] = useState("fisica"); // "fisica" o "juridica"
  const [inmobiliariaId, setInmobiliariaId] = useState(null); // Para Admin/Gestor

  // React Hook Form setup
  const {
    register,handleSubmit,formState: { errors },setValue,watch,reset,setError: setFormError,clearErrors,
  } = useForm({resolver: zodResolver(personaCreateSchema),defaultValues: buildInitialForm(),mode: "onSubmit", reValidateMode: "onSubmit",
  });

  const formValues = watch();

  // Cargar inmobiliarias al abrir (solo Admin/Gestor)
  useEffect(() => {
    if (!open) return;
    
    if (isAdminOrGestor && inmobiliarias.length === 0) {
      setLoadingInmobiliarias(true);
      (async () => {
        try {
          const resp = await getAllInmobiliarias({ estado: "ACTIVA" });
          const inmobiliariasList = (resp.data || []).map((inm) => ({
            value: inm.id,
            label: inm.nombre || inm.razonSocial || `Inmobiliaria ${inm.id}`
          }));
          setInmobiliarias(inmobiliariasList);
        } catch (err) {
          console.error("Error cargando inmobiliarias:", err);
        } finally {
          setLoadingInmobiliarias(false);
        }
      })();
    }
  }, [open, isAdminOrGestor, inmobiliarias.length]);

  // Para INMOBILIARIA: cargar su propia inmobiliaria si no está en user
  const [userInmobiliaria, setUserInmobiliaria] = useState(null);
  const [loadingUserInmobiliaria, setLoadingUserInmobiliaria] = useState(false);
  useEffect(() => {
    if (!open || !isInmobiliaria) {
      setUserInmobiliaria(null);
      setLoadingUserInmobiliaria(false);
      return;
    }
    
    // Si ya tenemos la inmobiliaria completa en user, usarla directamente
    if (user?.inmobiliaria) {
      setUserInmobiliaria(user.inmobiliaria);
      setLoadingUserInmobiliaria(false);
      return;
    }
    
    // Si tenemos inmobiliariaNombre, crear objeto simple
    if (user?.inmobiliariaNombre) {
      setUserInmobiliaria({ nombre: user.inmobiliariaNombre, razonSocial: user.inmobiliariaNombre });
      setLoadingUserInmobiliaria(false);
      return;
    }
    
    // Si tenemos el ID, cargar la inmobiliaria
    if (user?.inmobiliariaId) {
      setLoadingUserInmobiliaria(true);
      (async () => {
        try {
          // Intentar primero con getInmobiliariaById si está disponible
          try {
            const inmResp = await getInmobiliariaById(user.inmobiliariaId);
            const inm = inmResp?.data || inmResp;
            if (inm && (inm.nombre || inm.razonSocial)) {
              setUserInmobiliaria(inm);
              setLoadingUserInmobiliaria(false);
              return;
            }
          } catch (e) {
            // Si falla, intentar con getAllInmobiliarias
          }
          
          // Fallback: buscar en la lista completa (sin filtro de estado para asegurar que encontremos la inmobiliaria)
          const resp = await getAllInmobiliarias({});
          const inmobiliariasList = resp?.data || [];
          const inm = inmobiliariasList.find(i => {
            const inmId = i.id;
            const userId = user.inmobiliariaId;
            return inmId === userId || String(inmId) === String(userId) || Number(inmId) === Number(userId);
          });
          if (inm) {
            setUserInmobiliaria(inm);
          }
        } catch (err) {
          // Error silencioso, se mostrará "La Federala" como fallback
        } finally {
          setLoadingUserInmobiliaria(false);
        }
      })();
    } else {
      setLoadingUserInmobiliaria(false);
    }
  }, [open, isInmobiliaria, user]);

  // Resetear formulario al abrir/cerrar
  useEffect(() => {
    if (!open) {
      reset(buildInitialForm());
      setError(null);
      setShowSuccess(false);
      setSaving(false);
      setTipoPersona("fisica");
      clearErrors();
    }
  }, [open, reset, clearErrors]);

  const handleReset = () => {
    reset(buildInitialForm());
    setError(null);
    setTipoPersona("fisica");
    setInmobiliariaId(null);
    clearErrors();
  };

  const onSubmit = async (data) => {
    setError(null);
    clearErrors();

    setSaving(true);
    try {
      // Construir payload desde los datos validados
      const payload = {
        identificadorTipo: data.identificadorTipo,
        identificadorValor: data.identificadorValor || "",
      };

      // Agregar nombre/apellido o razón social según corresponda
      if (data.razonSocial && data.razonSocial.trim()) {
        payload.razonSocial = data.razonSocial.trim();
      } else if (data.nombre && data.apellido) {
        payload.nombre = data.nombre.trim();
        payload.apellido = data.apellido.trim();
      }

      // Campos opcionales
      if (data.telefono != null && data.telefono !== "") {
        payload.telefono = Number(data.telefono);
      }
      if (data.email != null && data.email.trim()) {
        payload.email = data.email.trim();
      }

      // Cliente de: solo para Admin/Gestor (siempre enviar, incluso si es null para "La Federala")
      if (isAdminOrGestor) {
        payload.inmobiliariaId = inmobiliariaId ?? null;
      }

      const created = await createPersona(payload);
      
      if (!created?.id) {
        throw new Error("La persona se creó pero no se obtuvo el ID");
      }

      // Mostrar animación de éxito (sin toast)
      setShowSuccess(true);
      
      // Esperar un momento para mostrar la animación antes de cerrar
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCreated?.(created);
        onCancel?.();
      }, 1500);
    } catch (err) {
      let errorMsg = err?.message || "No se pudo crear la persona. Intenta nuevamente.";
      let isDuplicateError = false;
      
      // Si es un error de conflicto (persona duplicada), mostrar mensaje más claro
      if (err?.statusCode === 409 || err?.status === 409 || err?.response?.status === 409) {
        errorMsg = "Ya existe una persona con ese identificador.";
        isDuplicateError = true;
        // Mostrar también en el campo identificadorValor usando RHF
        setFormError("identificadorValor", {
          type: "manual",
          message: "Ya existe una persona con ese identificador.",
        });
      }
      
      // Si es un error de validación del backend, mostrar el mensaje específico
      if (err?.statusCode === 400 || err?.status === 400 || err?.response?.status === 400) {
        errorMsg = err?.message || "Los datos ingresados no son válidos. Verifica los campos obligatorios.";
      }
      setError(errorMsg);
      setSaving(false);
    }
  };

  // Renderizar animación incluso si el modal se está cerrando
  if (!open && !showSuccess) return null;

  return (
    <>
      {/* Animación de éxito - se muestra incluso si open es false */}
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 10000,
            animation: "fadeIn 0.2s ease-in",
            pointerEvents: "auto",
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.9); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            @keyframes checkmark {
              0% { transform: scale(0); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
          `}</style>
          <div
            style={{
              background: "#fff",
              padding: "32px 48px",
              borderRadius: "12px",
              boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              animation: "scaleIn 0.3s ease-out",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "#10b981",
                display: "grid",
                placeItems: "center",
                animation: "checkmark 0.5s ease-in-out",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 600,
                color: "#111",
              }}
            >
              ¡Persona creada exitosamente!
            </h3>
          </div>
        </div>
      )}

      <EditarBase
        open={open}
        title="Crear Nueva Persona"
        onCancel={() => {
          if (showSuccess) return;
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        saveButtonText={saving ? "Creando..." : "Crear Persona"}
        onSave={handleSubmit(onSubmit)}
        onReset={handleReset}
        saving={saving}
      >
        <div
          style={{
            maxWidth: "900px",
            width: "100%",
            margin: "0 auto",
            padding: "0 16px"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
            }}
            className="persona-create-grid"
          >
            {/* Tipo de Persona: toggle entre Física y Jurídica */}
            <div className="fieldRow" style={{ gridColumn: "1 / -1" }}>
              <div className="field-row">
                <div className="field-label">TIPO DE PERSONA</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={tipoPersona}
                    options={[
                      { value: "fisica", label: "Persona Física" },
                      { value: "juridica", label: "Persona Jurídica" },
                    ]}
                    placeholder="Seleccionar tipo"
                    onChange={(value) => {
                      setTipoPersona(value);
                      if (value === "juridica") {
                        setValue("razonSocial", "");
                        setValue("nombre", "");
                        setValue("apellido", "");
                        clearErrors(["nombre", "apellido", "razonSocial"]);
                      } else {
                        setValue("razonSocial", "");
                        clearErrors("razonSocial");
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Razón Social (si es jurídica) */}
            {tipoPersona === "juridica" && (
              <div className={`fieldRow ${errors.razonSocial ? "hasError" : ""}`} style={{ gridColumn: "1 / -1" }}>
                <div className="field-row">
                  <div className="field-label">RAZÓN SOCIAL *</div>
                  <div className="field-value p0">
                    <input
                      {...register("razonSocial")}
                      className={`field-input ${errors.razonSocial ? "is-invalid" : ""}`}
                      type="text"
                      placeholder="Razón social"
                    />
                  </div>
                </div>
                {errors.razonSocial && (
                  <div className="fieldError">{errors.razonSocial.message}</div>
                )}
              </div>
            )}

            {/* Nombre y Apellido (si es física) */}
            {tipoPersona === "fisica" && (
              <>
                <div className={`fieldRow ${errors.nombre ? "hasError" : ""}`}>
                  <div className="field-row">
                    <div className="field-label">NOMBRE *</div>
                    <div className="field-value p0">
                      <input
                        {...register("nombre")}
                        className={`field-input ${errors.nombre ? "is-invalid" : ""}`}
                        type="text"
                        placeholder="Nombre"
                        onChange={(e) => {
                          const valor = e.target.value;
                          if (valor === "" || /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]*$/.test(valor)) {
                            setValue("nombre", valor);
                          }
                        }}
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
                        {...register("apellido")}
                        className={`field-input ${errors.apellido ? "is-invalid" : ""}`}
                        type="text"
                        placeholder="Apellido"
                        onChange={(e) => {
                          const valor = e.target.value;
                          if (valor === "" || /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]*$/.test(valor)) {
                            setValue("apellido", valor);
                          }
                        }}
                      />
                    </div>
                  </div>
                  {errors.apellido && (
                    <div className="fieldError">{errors.apellido.message}</div>
                  )}
                </div>
              </>
            )}

            {/* Tipo Identificador */}
            <div className={`fieldRow ${errors.identificadorTipo ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">TIPO IDENTIFICADOR *</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={formValues.identificadorTipo ?? ""}
                    options={TIPOS_IDENTIFICADOR}
                    placeholder="Seleccionar tipo"
                    onChange={(value) => {
                      setValue("identificadorTipo", value);
                      // Limpiar valor al cambiar tipo
                      setValue("identificadorValor", "");
                      clearErrors("identificadorValor");
                    }}
                  />
                </div>
              </div>
              {errors.identificadorTipo && (
                <div className="fieldError">{errors.identificadorTipo.message}</div>
              )}
            </div>

            {/* Identificador */}
            <div className={`fieldRow ${errors.identificadorValor ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">IDENTIFICADOR *</div>
                <div className="field-value p0">
                  <input
                    {...register("identificadorValor")}
                    className={`field-input ${errors.identificadorValor ? "is-invalid" : ""}`}
                    type="text"
                    placeholder={
                      formValues.identificadorTipo === "DNI" ? "Ej: 12345678 (8 dígitos)" :
                      formValues.identificadorTipo === "PASAPORTE" ? "Ej: ABC123456 (6-9 caracteres)" :
                      formValues.identificadorTipo === "CUIL" || formValues.identificadorTipo === "CUIT" 
                        ? "Ej: 12-34567890-1 (11 dígitos)" :
                      "Valor del identificador"
                    }
                  />
                </div>
              </div>
              {errors.identificadorValor && (
                <div className="fieldError">{errors.identificadorValor.message}</div>
              )}
            </div>

            {/* Teléfono */}
            <div className={`fieldRow ${errors.telefono ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">TELÉFONO</div>
                <div className="field-value p0">
                  <input
                    {...register("telefono", { valueAsNumber: true })}
                    className={`field-input ${errors.telefono ? "is-invalid" : ""}`}
                    type="text"
                    inputMode="numeric"
                    placeholder="Opcional (solo números)"
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (valor === "" || /^\d*$/.test(valor)) {
                        setValue("telefono", valor === "" ? undefined : valor);
                      }
                    }}
                  />
                </div>
              </div>
              {errors.telefono && (
                <div className="fieldError">{errors.telefono.message}</div>
              )}
            </div>

            {/* Email */}
            <div className={`fieldRow ${errors.email ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">EMAIL</div>
                <div className="field-value p0">
                  <input
                    {...register("email")}
                    className={`field-input ${errors.email ? "is-invalid" : ""}`}
                    type="email"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              {errors.email && (
                <div className="fieldError">{errors.email.message}</div>
              )}
            </div>

            {/* Cliente de: solo para Admin/Gestor */}
            {isAdminOrGestor && (
              <div className={`fieldRow ${errors.inmobiliariaId ? "hasError" : ""}`} style={{ gridColumn: "1 / -1" }}>
                <div className="field-row">
                  <div className="field-label">CLIENTE DE</div>
                  <div className="field-value p0">
                    <NiceSelect
                      value={inmobiliariaId ?? ""}
                      options={[
                        { value: "", label: "La Federala" },
                        ...inmobiliarias.map(inm => ({
                          value: String(inm.value),
                          label: inm.label
                        }))
                      ]}
                      placeholder={loadingInmobiliarias ? "Cargando..." : "Seleccionar"}
                      onChange={(val) => setInmobiliariaId(val === "" ? null : Number(val))}
                      usePortal={true}
                    />
                  </div>
                </div>
                {errors.inmobiliariaId && (
                  <div className="fieldError">{errors.inmobiliariaId.message}</div>
                )}
              </div>
            )}

            {/* INMOBILIARIA: mostrar Cliente de como read-only */}
            {isInmobiliaria && (
              <div className="fieldRow" style={{ gridColumn: "1 / -1" }}>
                <div className="field-row">
                  <div className="field-label">CLIENTE DE</div>
                  <div className="field-value is-readonly">
                    {loadingUserInmobiliaria 
                      ? "Cargando..." 
                      : (userInmobiliaria?.nombre || userInmobiliaria?.razonSocial || user?.inmobiliariaNombre || user?.inmobiliaria?.nombre || user?.inmobiliaria?.razonSocial || "La Federala")
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px 16px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              color: "#991b1b",
              fontSize: 13.5,
            }}
          >
            {error}
          </div>
        )}
      </EditarBase>
    </>
  );
}
