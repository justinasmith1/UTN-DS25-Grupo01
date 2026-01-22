// src/components/Cards/Personas/PersonaEditarCard.jsx
import { useState, useEffect, useRef } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import NiceSelect from "../../Base/NiceSelect.jsx";
import { updatePersona, getPersona } from "../../../lib/api/personas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
import { isEliminado } from "../../../utils/estadoOperativo";
import { extractEmail, extractTelefono } from "../../../utils/personaContacto";

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
      getAllInmobiliarias({ estado: "OPERATIVO" })
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
    
    // Bloquear submit si está eliminado
    if (isEliminado(detalle)) {
      return;
    }
    
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
      
      // Solo incluir inmobiliariaId para ADMIN/GESTOR
      // IMPORTANTE: NO enviar estado/estadoOperativo - solo endpoints de desactivar/reactivar pueden cambiarlo
      if (isAdminOrGestor) {
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
      <SuccessAnimation show={showSuccess} message="¡Persona guardada exitosamente!" />

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
                    disabled={eliminado}
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
                      disabled={eliminado}
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
                  disabled={eliminado}
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
                  disabled={eliminado}
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
                      { value: "OPERATIVO", label: "OPERATIVO" },
                      { value: "ELIMINADO", label: "ELIMINADO" },
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
                    disabled={eliminado}
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
