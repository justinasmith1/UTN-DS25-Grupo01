// src/components/Cards/Personas/PersonaEditarCard.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import EditarBase from "../Base/EditarBase.jsx";
import { updatePersona, getPersona } from "../../../lib/api/personas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
import { extractEmail, extractTelefono } from "../../../utils/personaContacto";

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

export default function PersonaEditarCard({
  open,
  onCancel,
  onUpdated,
  persona,
  personaId,
  personas,
}) {
  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();
  const isAdminOrGestor = userRole === "ADMINISTRADOR" || userRole === "GESTOR";
  const isInmobiliaria = userRole === "INMOBILIARIA";

  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Estados del formulario
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [tipoIdentificador, setTipoIdentificador] = useState("CUIL");
  const [valorIdentificador, setValorIdentificador] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("ACTIVA");
  const [inmobiliariaId, setInmobiliariaId] = useState(null);
  
  // Estados auxiliares
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [loadingInmobiliarias, setLoadingInmobiliarias] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Cargar datos de la persona cuando se abre o cambia personaId/persona
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) {
        setDetalle(null);
        return;
      }

      const idToUse = persona?.id ?? personaId;

      if (idToUse != null) {
        try {
          setLoading(true);
          const full = await getPersona(idToUse);
          if (!abort && full) {
            setDetalle(full);
          }
        } catch (e) {
          console.error("Error obteniendo persona por id:", e);
          if (persona && !abort) {
            setDetalle(persona);
          }
        } finally {
          if (!abort) setLoading(false);
        }
      } else if (personaId != null && Array.isArray(personas) && !abort) {
        const found = personas.find(p => `${p.id}` === `${personaId}`);
        if (found) {
          setDetalle(found);
        }
      } else if (persona) {
        if (!abort) setDetalle(persona);
      }
    }
    run();
    return () => { abort = true; };
  }, [open, persona?.id, personaId, persona, personas]);

  // Cargar inmobiliarias para selector (solo ADMIN/GESTOR)
  useEffect(() => {
    if (open && isAdminOrGestor) {
      setLoadingInmobiliarias(true);
      getAllInmobiliarias({ estado: "ACTIVA" })
        .then((res) => {
          const inmobiliariasList = (res.data || []).map((inm) => ({
            value: inm.id,
            label: inm.nombre || inm.razonSocial || `Inmobiliaria ${inm.id}`
          }));
          setInmobiliarias(inmobiliariasList);
        })
        .catch((err) => {
          console.error("Error al cargar inmobiliarias:", err);
          setInmobiliarias([]);
        })
        .finally(() => {
          setLoadingInmobiliarias(false);
        });
    }
  }, [open, isAdminOrGestor]);

  // Precargar formulario cuando se carga detalle
  useEffect(() => {
    if (detalle) {
      setNombre(detalle.nombre || "");
      setApellido(detalle.apellido || "");
      setRazonSocial(detalle.razonSocial || "");
      setTipoIdentificador(detalle.identificadorTipo || "CUIL");
      setValorIdentificador(detalle.identificadorValor || "");
      setEstado(detalle.estado || "ACTIVA");
      setInmobiliariaId(detalle.inmobiliariaId || null);
      
      // Cargar email y teléfono usando helpers centralizados
      const emailExtraido = extractEmail(detalle.email, detalle.contacto);
      const telefonoExtraido = extractTelefono(detalle.telefono, detalle.contacto);
      
      setEmail(emailExtraido || "");
      setTelefono(telefonoExtraido || "");
      
      setError(null);
    }
  }, [detalle]);

  // Resetear cuando se cierra
  useEffect(() => {
    if (!open) {
      setSaving(false);
      setShowSuccess(false);
      setError(null);
    }
  }, [open]);

  // Handler para restablecer cambios
  const handleReset = () => {
    if (!detalle) return;
    
    setNombre(detalle.nombre || "");
    setApellido(detalle.apellido || "");
    setRazonSocial(detalle.razonSocial || "");
    setTipoIdentificador(detalle.identificadorTipo || "CUIL");
    setValorIdentificador(detalle.identificadorValor || "");
    setEstado(detalle.estado || "ACTIVA");
    setInmobiliariaId(detalle.inmobiliariaId || null);
    
    // Restablecer email y teléfono desde detalle
    const emailExtraido = extractEmail(detalle.email, detalle.contacto);
    const telefonoExtraido = extractTelefono(detalle.telefono, detalle.contacto);
    
    setEmail(emailExtraido || "");
    setTelefono(telefonoExtraido || "");
    setError(null);
  };

  // Handler para guardar cambios
  const handleSave = async () => {
    if (!detalle?.id) return;
    
    setError(null);
    setSaving(true);

    // Validaciones básicas
    const tieneRazonSocial = razonSocial && razonSocial.trim();
    const tieneNombreApellido = nombre && nombre.trim() && apellido && apellido.trim();
    
    if (!tieneRazonSocial && !tieneNombreApellido) {
      setError("Debe proporcionar razón social (persona jurídica) o nombre y apellido (persona física).");
      setSaving(false);
      return;
    }

    if (!valorIdentificador || !valorIdentificador.trim()) {
      setError("El identificador es obligatorio.");
      setSaving(false);
      return;
    }

    // Validar formato de identificador según tipo
    const valorTrim = valorIdentificador.trim();
    if (tipoIdentificador === "DNI" && !/^\d{8}$/.test(valorTrim.replace(/-/g, ""))) {
      setError("El DNI debe tener 8 dígitos.");
      setSaving(false);
      return;
    }

    if ((tipoIdentificador === "CUIT" || tipoIdentificador === "CUIL") && 
        !/^\d{11}$/.test(valorTrim.replace(/-/g, ""))) {
      setError("El CUIT/CUIL debe tener 11 dígitos.");
      setSaving(false);
      return;
    }

    if (tipoIdentificador === "PASAPORTE" && !/^[A-Z0-9]{6,9}$/.test(valorTrim)) {
      setError("El pasaporte debe tener entre 6 y 9 caracteres alfanuméricos.");
      setSaving(false);
      return;
    }

    // Validar email: si está vacío, enviar null explícitamente
    let emailStr = null;
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError("El email no es válido.");
        setSaving(false);
        return;
      }
      emailStr = email.trim();
    }
    // Si email está vacío o solo espacios, enviar null explícitamente
    if (!email || !email.trim()) {
      emailStr = null;
    }
    
    // Validar teléfono: si está vacío, enviar null explícitamente
    let telefonoNum = null;
    if (telefono && telefono.trim()) {
      if (!/^\d+$/.test(telefono.trim())) {
        setError("El teléfono solo puede contener números.");
        setSaving(false);
        return;
      }
      const n = Number(telefono.trim());
      if (!Number.isFinite(n) || n <= 0) {
        setError("El teléfono debe ser un número positivo.");
        setSaving(false);
        return;
      }
      telefonoNum = n;
    }
    // Si telefono está vacío o solo espacios, enviar null explícitamente
    if (!telefono || !telefono.trim()) {
      telefonoNum = null;
    }

    // RBAC: INMOBILIARIA solo puede editar sus clientes
    if (isInmobiliaria && detalle?.inmobiliariaId !== user?.inmobiliariaId) {
      setError("No puede editar personas que no son sus clientes.");
      setSaving(false);
      return;
    }

    try {
      // Construir payload limpio (sin undefined)
      const payload = {
        identificadorTipo: tipoIdentificador,
        identificadorValor: valorTrim,
      };
      
      if (tieneRazonSocial) {
        payload.razonSocial = razonSocial.trim();
      }
      
      if (tieneNombreApellido) {
        payload.nombre = nombre.trim();
        payload.apellido = apellido.trim();
      }
      
      // Incluir telefono siempre (puede ser null para limpiarlo)
      // IMPORTANTE: enviar null explícitamente cuando está vacío
      payload.telefono = telefonoNum;
      
      // Incluir email siempre (puede ser null para limpiarlo)
      // IMPORTANTE: enviar null explícitamente cuando está vacío
      payload.email = emailStr;
      
      // Solo incluir estado e inmobiliariaId para ADMIN/GESTOR
      // IMPORTANTE: incluir siempre, incluso si es null, para que el backend pueda actualizarlos
      if (isAdminOrGestor) {
        payload.estado = estado;
        // Incluir inmobiliariaId siempre (puede ser null para "La Federala")
        payload.inmobiliariaId = inmobiliariaId ?? null;
      }

      const updated = await updatePersona(detalle.id, payload);
      
      // Mostrar animación de éxito
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onUpdated?.(updated);
        onCancel?.();
      }, 1500);
    } catch (err) {
      console.error("Error actualizando persona:", err);
      if (err.status === 409) {
        setError("Ya existe una persona con ese identificador.");
      } else if (err.status === 400) {
        setError(err.message || "Error de validación. Verifique los datos ingresados.");
      } else {
        setError(err.message || "No se pudo actualizar la persona. Intenta nuevamente.");
      }
      setSaving(false);
    }
  };

  if (!open || !detalle) return null;

  return (
    <>
      {/* Animación de éxito */}
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
              ¡Persona guardada exitosamente!
            </h3>
          </div>
        </div>
      )}

      <EditarBase
        open={open}
        title="Editar Persona"
        onCancel={onCancel}
        onSave={handleSave}
        onReset={detalle ? handleReset : undefined}
        saving={saving}
        saveButtonText="Guardar cambios"
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
            className="persona-edit-grid"
          >
            {/* Razón Social o Nombre/Apellido según tipo */}
            {razonSocial && razonSocial.trim() ? (
              <div className="field-row" style={{ gridColumn: "1 / -1" }}>
                <div className="field-label">RAZÓN SOCIAL</div>
                <div className="field-value p0">
                  <input
                    className="field-input"
                    type="text"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="Razón social"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="field-row">
                  <div className="field-label">NOMBRE</div>
                  <div className="field-value p0">
                    <input
                      className="field-input"
                      type="text"
                      value={nombre}
                      onChange={(e) => {
                        const valor = e.target.value;
                        if (valor === "" || /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]*$/.test(valor)) {
                          setNombre(valor);
                        }
                      }}
                      placeholder="Nombre (solo letras)"
                    />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field-label">APELLIDO</div>
                  <div className="field-value p0">
                    <input
                      className="field-input"
                      type="text"
                      value={apellido}
                      onChange={(e) => {
                        const valor = e.target.value;
                        if (valor === "" || /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]*$/.test(valor)) {
                          setApellido(valor);
                        }
                      }}
                      placeholder="Apellido (solo letras)"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="field-row">
              <div className="field-label">TIPO IDENTIFICADOR</div>
              <div className="field-value p0">
                <NiceSelect
                  value={tipoIdentificador}
                  options={[
                    { value: "CUIL", label: "CUIL" },
                    { value: "CUIT", label: "CUIT" },
                    { value: "DNI", label: "DNI" },
                    { value: "PASAPORTE", label: "Pasaporte" },
                  ]}
                  placeholder="Seleccionar tipo"
                  onChange={(val) => setTipoIdentificador(val)}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">IDENTIFICADOR</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="text"
                  value={valorIdentificador}
                  onChange={(e) => setValorIdentificador(e.target.value)}
                  placeholder={
                    tipoIdentificador === "DNI" ? "Ej: 12345678 (8 dígitos)" :
                    tipoIdentificador === "PASAPORTE" ? "Ej: ABC123456 (6-9 caracteres)" :
                    "Ej: 12-34567890-1 (formato CUIT/CUIL)"
                  }
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">TELÉFONO</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="text"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (valor === "" || /^\d*$/.test(valor)) {
                      setTelefono(valor);
                    }
                  }}
                  placeholder="Opcional (solo números)"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">EMAIL</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            {/* Estado solo para ADMIN/GESTOR */}
            {isAdminOrGestor && (
              <div className="field-row">
                <div className="field-label">ESTADO</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={estado}
                    options={[
                      { value: "ACTIVA", label: "ACTIVA" },
                      { value: "INACTIVA", label: "INACTIVA" },
                    ]}
                    placeholder="Seleccionar estado"
                    onChange={(val) => setEstado(val)}
                  />
                </div>
              </div>
            )}

            {/* Cliente de solo para ADMIN/GESTOR */}
            {isAdminOrGestor && (
              <div className="field-row">
                <div className="field-label">CLIENTE DE</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={inmobiliariaId || ""}
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
            )}

            {/* INMOBILIARIA: mostrar Cliente de como read-only */}
            {isInmobiliaria && (
              <div className="field-row">
                <div className="field-label">CLIENTE DE</div>
                <div className="field-value is-readonly">
                  {detalle?.inmobiliaria?.nombre || "La Federala"}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <style>{`
          @media (max-width: 768px) {
            .persona-edit-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

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
