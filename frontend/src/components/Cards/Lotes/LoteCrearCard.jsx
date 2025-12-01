import { useEffect, useMemo, useState, useRef } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { createLote } from "../../../lib/api/lotes.js";
import { getAllFracciones } from "../../../lib/api/fracciones.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import { uploadArchivo } from "../../../lib/api/archivos.js";
import { useToast } from "../../../app/providers/ToastProvider.jsx";
import { req, positive, normNum } from "../../../lib/forms/validate.js";
import LoteImageUploader from "./LoteImageUploader.jsx";

/* ----------------------- Select custom sin librerías ----------------------- */
function NiceSelect({ value, options, placeholder = "Sin información", onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!btnRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const label = options.find(o => `${o.value}` === `${value}`)?.label ?? placeholder;

  return (
    <div className="ns-wrap" style={{ position: "relative" }}>
      <button
        type="button"
        ref={btnRef}
        className="ns-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label}</span>
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
          <polyline points="5,7 10,12 15,7" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul ref={listRef} className="ns-list" role="listbox" tabIndex={-1}>
          {(placeholder ? [{ value: "", label: placeholder }, ...options] : options).map(opt => (
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
      )}
    </div>
  );
}

const TIPOS = [
  { value: "Lote Venta", label: "Lote Venta" },
  { value: "Espacio Comun", label: "Espacio Común" },
];

const ESTADOS = [
  { value: "Disponible", label: "Disponible" },
  { value: "Reservado", label: "Reservado" },
  { value: "Vendido", label: "Vendido" },
  { value: "No Disponible", label: "No Disponible" },
  { value: "Alquilado", label: "Alquilado" },
  { value: "En Promoción", label: "En Promoción" },
];

const SUBESTADOS = [
  { value: "No Construido", label: "No Construido" },
  { value: "En Construccion", label: "En Construcción" },
  { value: "Construido", label: "Construido" },
];


// Listado de calles disponibles (enum NombreCalle del backend)
const CALLES_OPTIONS = [
  { value: "REINAMORA", label: "REINAMORA" },
  { value: "MACA", label: "MACA" },
  { value: "ZORZAL", label: "ZORZAL" },
  { value: "CAUQUEN", label: "CAUQUEN" },
  { value: "ALONDRA", label: "ALONDRA" },
  { value: "JACANA", label: "JACANA" },
  { value: "TACUARITO", label: "TACUARITO" },
  { value: "JILGUERO", label: "JILGUERO" },
  { value: "GOLONDRINA", label: "GOLONDRINA" },
  { value: "CALANDRIA", label: "CALANDRIA" },
  { value: "AGUILAMORA", label: "AGUILAMORA" },
  { value: "LORCA", label: "LORCA" },
  { value: "MILANO", label: "MILANO" },
];

const LABELS = [
  "NÚMERO",
  "NÚMERO PARTIDA",
  "TIPO",
  "ESTADO",
  "SUB-ESTADO",
  "FRACCIÓN",
  "SUPERFICIE",
  "FRENTE",
  "FONDO",
  "PRECIO",
  "DESCRIPCIÓN",
];

const buildInitialForm = () => {
  return {
    numero: "",
    tipo: "",
    estado: "",
    subestado: "",
    numPartido: "",
    fraccionId: "",
    fraccionNumero: "",
    propietarioId: "",
    superficie: "",
    frente: "",
    fondo: "",
    precio: "",
    descripcion: "",
    nombreEspacioComun: "",
    capacidad: "",
    calle: "", // Campo para la calle de la ubicación
    numeroCalle: "", // Campo para el número de la ubicación
    images: [],
  };
};

export default function LoteCrearCard({
  open,
  onCancel,
  onCreated,
}) {
  const { success, error: showError } = useToast();
  const [form, setForm] = useState(buildInitialForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fracciones, setFracciones] = useState([]);
  const [loadingFracciones, setLoadingFracciones] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Cargar fracciones y personas al abrir
  useEffect(() => {
    if (!open) return;
    
    // Cargar fracciones
    if (fracciones.length === 0) {
      setLoadingFracciones(true);
      (async () => {
        try {
          const resp = await getAllFracciones();
          if (resp.success && resp.data?.fracciones) {
            setFracciones(resp.data.fracciones);
          }
        } catch (err) {
          console.error("Error cargando fracciones:", err);
        } finally {
          setLoadingFracciones(false);
        }
      })();
    }

    // Cargar personas
    if (personas.length === 0) {
      setLoadingPersonas(true);
      (async () => {
        try {
          const resp = await getAllPersonas({});
          // getAllPersonas devuelve { personas: [...], total: ... }
          const personasData = resp?.personas ?? (Array.isArray(resp) ? resp : []);
          setPersonas(Array.isArray(personasData) ? personasData : []);
          console.log("✅ Personas cargadas:", personasData.length);
        } catch (err) {
          console.error("❌ Error cargando personas:", err);
          setPersonas([]);
        } finally {
          setLoadingPersonas(false);
        }
      })();
    }
  }, [open, fracciones.length, personas.length]);

  const computedLabelWidth = useMemo(() => {
    const longest = Math.max(...LABELS.map((l) => l.length));
    return Math.min(260, Math.max(160, Math.round(longest * 8.2) + 22));
  }, []);

  // Opciones de personas para el selector
  const personaOpts = useMemo(() => {
    return personas.map((p) => {
      const id = p.id ?? p.idPersona ?? "";
      const nombre = p.nombre ?? p.firstName ?? "";
      const apellido = p.apellido ?? p.lastName ?? "";
      const nombreCompleto = p.nombreCompleto ?? (`${nombre} ${apellido}`.trim() || `Persona ${id}`);
      return {
        value: String(id),
        label: nombreCompleto
      };
    });
  }, [personas]);

  // Resetear formulario al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setForm(buildInitialForm());
      setError(null);
      setFieldErrors({});
      setShowSuccess(false);
      setSaving(false);
    }
  }, [open]);

  const updateForm = (patch) => {
    setForm((prev) => {
      const updated = { ...prev, ...patch };
      
      // Calcular superficie automáticamente cuando cambian frente o fondo
      if ('frente' in patch || 'fondo' in patch) {
        const frente = normNum(updated.frente);
        const fondo = normNum(updated.fondo);
        if (frente != null && fondo != null && frente >= 0 && fondo >= 0) {
          updated.superficie = String(frente * fondo);
        } else {
          updated.superficie = "";
        }
      }
      
      return updated;
    });
    // Limpiar error del campo cuando se modifica
    if (patch && Object.keys(patch).length > 0) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        Object.keys(patch).forEach((key) => {
          delete next[key];
        });
        return next;
      });
    }
  };

  const handleReset = () => {
    setForm(buildInitialForm());
    setError(null);
    setFieldErrors({});
  };

  // Callback para manejar cambios en las imágenes desde el componente reutilizable
  const handleImagesChange = (newImages) => {
    setForm((prev) => ({ ...prev, images: newImages }));
  };

  const buildPayload = () => {
    const payload = {};

    // Campos obligatorios
    const numero = normNum(form.numero);
    if (numero != null && numero > 0) payload.numero = numero;
    
    if (form.tipo) payload.tipo = form.tipo;
    if (form.estado) payload.estado = form.estado;
    if (form.subestado) payload.subestado = form.subestado;

    // numPartido: si no se proporciona, usar default del backend (62)
    const numPartido = normNum(form.numPartido);
    payload.numPartido = numPartido != null ? numPartido : 62;

    // Calcular superficie automáticamente si hay frente y fondo
    const frente = normNum(form.frente);
    const fondo = normNum(form.fondo);
    let superficie = normNum(form.superficie);
    
    if (frente != null && fondo != null && frente >= 0 && fondo >= 0) {
      superficie = frente * fondo;
    }
    
    if (superficie != null && superficie >= 0) {
      payload.superficie = superficie;
    }

    if (frente != null) payload.frente = frente;
    if (fondo != null) payload.fondo = fondo;

    const precio = normNum(form.precio);
    if (precio != null) payload.precio = precio;

    if (form.descripcion != null && form.descripcion.trim()) {
      payload.descripcion = form.descripcion.trim();
    }

    const fraccionId = normNum(form.fraccionId);
    if (fraccionId) payload.fraccionId = fraccionId;

    // Propietario es obligatorio
    const propietarioId = normNum(form.propietarioId);
    if (propietarioId) payload.propietarioId = propietarioId;

    // Ubicación: calle y número (opcionales)
    if (form.calle && form.calle.trim()) {
      payload.calle = form.calle.trim();
    }
    const numeroCalle = normNum(form.numeroCalle);
    if (numeroCalle != null && numeroCalle > 0) {
      payload.numeroCalle = numeroCalle;
    }

    // NO incluir imágenes en el payload - se subirán después de crear el lote

    // Campos específicos para Espacio Comun
    if (form.tipo === "Espacio Comun") {
      if (form.nombreEspacioComun != null && form.nombreEspacioComun.trim()) {
        payload.nombreEspacioComun = form.nombreEspacioComun.trim();
      }
      const capacidad = normNum(form.capacidad);
      if (capacidad != null && capacidad >= 0) {
        payload.capacidad = capacidad;
      }
    }

    return payload;
  };

  const validateForm = () => {
    const rules = {
      numero: [req("El número de lote es obligatorio"), positive("El número de lote debe ser un número positivo")],
      numPartido: [req("El número de partida es obligatorio"), positive("El número de partida debe ser un número positivo")],
      tipo: [req("El tipo es obligatorio")],
      estado: [req("El estado es obligatorio")],
      subestado: [req("El sub-estado es obligatorio")],
      fraccionId: [req("La fracción es obligatoria")],
      propietarioId: [req("El propietario es obligatorio"), positive("El propietario debe ser válido")],
    };

    const errors = {};
    const camposFaltantes = [];
    
    for (const [field, validators] of Object.entries(rules)) {
      for (const validate of validators) {
        const err = validate(form[field]);
        if (err) {
          errors[field] = err;
          // Agregar el nombre del campo a la lista de campos faltantes
          const nombresCampos = {
            numero: "Número de lote",
            numPartido: "Número de partida",
            tipo: "Tipo",
            estado: "Estado",
            subestado: "Sub-estado",
            fraccionId: "Fracción",
            propietarioId: "Propietario",
          };
          if (!camposFaltantes.includes(nombresCampos[field])) {
            camposFaltantes.push(nombresCampos[field]);
          }
          break;
        }
      }
    }

    // Validar que frente y fondo sean positivos si están presentes
    const frente = normNum(form.frente);
    const fondo = normNum(form.fondo);
    if (frente != null && frente < 0) {
      errors.frente = "El frente debe ser un número positivo";
    }
    if (fondo != null && fondo < 0) {
      errors.fondo = "El fondo debe ser un número positivo";
    }

    // Validar nombreEspacioComun si el tipo es "Espacio Comun"
    if (form.tipo === "Espacio Comun") {
      if (!form.nombreEspacioComun || !form.nombreEspacioComun.trim()) {
        errors.nombreEspacioComun = "El nombre del espacio común es obligatorio";
        if (!camposFaltantes.includes("Nombre del espacio común")) {
          camposFaltantes.push("Nombre del espacio común");
        }
      }
    }

    // Validar capacidad si está presente (debe ser positiva)
    const capacidad = normNum(form.capacidad);
    if (capacidad != null && capacidad < 0) {
      errors.capacidad = "La capacidad debe ser un número positivo";
    }

    setFieldErrors(errors);
    
    // Si hay errores, mostrar mensaje detallado
    if (Object.keys(errors).length > 0) {
      const mensajeCampos = camposFaltantes.length > 0 
        ? `Faltan completar los siguientes campos obligatorios: ${camposFaltantes.join(", ")}.`
        : "Por favor, completa todos los campos obligatorios correctamente.";
      setError(mensajeCampos);
    }
    
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setError(null);
    setFieldErrors({});

    if (!validateForm()) {
      // El mensaje de error ya se estableció en validateForm
      return;
    }

    setSaving(true);
    try {
      // 1. Crear el lote primero
      const payload = buildPayload();
      console.log("📤 Payload a enviar:", payload);
      const resp = await createLote(payload);
      const created = resp?.data ?? resp ?? {};
      
      if (!created?.id) {
        throw new Error("El lote se creó pero no se obtuvo el ID");
      }

      // 2. Subir las imágenes si hay
      if (form.images.length > 0) {
        try {
          const uploadPromises = form.images
            .filter((img) => img instanceof File)
            .map((file) => uploadArchivo(file, created.id, "IMAGEN"));
          
          await Promise.all(uploadPromises);
          console.log("✅ Imágenes subidas exitosamente");
        } catch (uploadErr) {
          console.error("⚠️ Error subiendo imágenes:", uploadErr);
          // No fallar la creación del lote si falla la subida de imágenes
          showError("Lote creado, pero hubo un error al subir algunas imágenes");
        }
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
      console.error("Error creando lote:", err);
      let errorMsg = err?.message || "No se pudo crear el lote. Intenta nuevamente.";
      
      // Si es un error de conflicto (lote duplicado), mostrar mensaje más claro
      if (err?.statusCode === 409 || err?.response?.status === 409) {
        errorMsg = err?.message || "Ya existe un lote con ese número en la fracción seleccionada. Por favor, elige otro número.";
      }
      
      // Si es un error de validación del backend, mostrar el mensaje específico
      if (err?.statusCode === 400 || err?.response?.status === 400) {
        errorMsg = err?.message || "Los datos ingresados no son válidos. Verifica los campos obligatorios.";
      }
      
      setError(errorMsg);
      showError(errorMsg);
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
              ¡Lote creado exitosamente!
            </h3>
          </div>
        </div>
      )}

      <EditarBase
        open={open}
        title="Crear Nuevo Lote"
        onCancel={() => {
          if (showSuccess) return;
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        saveButtonText={saving ? "Creando..." : "Crear Lote"}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
      >
        <div
          className="lote-grid"
          style={{ ["--sale-label-w"]: `${computedLabelWidth}px` }}
        >
          <div className="lote-data-col">
            <div className="field-row">
              <div className="field-label">Número *</div>
              <div className="field-value p0">
                <input
                  className={`field-input ${fieldErrors.numero ? "is-invalid" : ""}`}
                  type="number"
                  inputMode="numeric"
                  value={form.numero ?? ""}
                  onChange={(e) => updateForm({ numero: e.target.value })}
                  placeholder="Número de lote"
                />
                {fieldErrors.numero && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.numero}
                  </div>
                )}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Número Partida *</div>
              <div className="field-value p0">
                <input
                  className={`field-input ${fieldErrors.numPartido ? "is-invalid" : ""}`}
                  type="number"
                  inputMode="numeric"
                  value={form.numPartido ?? ""}
                  onChange={(e) => updateForm({ numPartido: e.target.value })}
                  placeholder="Número de partida"
                />
                {fieldErrors.numPartido && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.numPartido}
                  </div>
                )}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Tipo *</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.tipo}
                  options={TIPOS}
                  placeholder="Seleccionar tipo"
                  onChange={(value) => {
                    // Limpiar campos de espacio común si se cambia a otro tipo
                    updateForm({ 
                      tipo: value,
                      nombreEspacioComun: value === "Espacio Comun" ? form.nombreEspacioComun : "",
                      capacidad: value === "Espacio Comun" ? form.capacidad : ""
                    });
                    // Limpiar errores de validación de estos campos
                    if (value !== "Espacio Comun") {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.nombreEspacioComun;
                        delete next.capacidad;
                        return next;
                      });
                    }
                  }}
                />
                {fieldErrors.tipo && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.tipo}
                  </div>
                )}
              </div>
            </div>

            {form.tipo === "Espacio Comun" && (
              <>
                <div className="field-row">
                  <div className="field-label">Nombre del Espacio Común *</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${fieldErrors.nombreEspacioComun ? "is-invalid" : ""}`}
                      type="text"
                      value={form.nombreEspacioComun ?? ""}
                      onChange={(e) => updateForm({ nombreEspacioComun: e.target.value })}
                      placeholder="Ej. Piscina"
                    />
                    {fieldErrors.nombreEspacioComun && (
                      <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                        {fieldErrors.nombreEspacioComun}
                      </div>
                    )}
                  </div>
                </div>

                <div className="field-row">
                  <div className="field-label">Capacidad</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${fieldErrors.capacidad ? "is-invalid" : ""}`}
                      type="number"
                      inputMode="numeric"
                      value={form.capacidad ?? ""}
                      onChange={(e) => updateForm({ capacidad: e.target.value })}
                      placeholder="Ej. 100"
                    />
                    {fieldErrors.capacidad && (
                      <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                        {fieldErrors.capacidad}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="field-row">
              <div className="field-label">Estado *</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.estado}
                  options={ESTADOS}
                  placeholder="Seleccionar estado"
                  onChange={(value) => updateForm({ estado: value })}
                />
                {fieldErrors.estado && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.estado}
                  </div>
                )}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Sub-Estado *</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.subestado}
                  options={SUBESTADOS}
                  placeholder="Seleccionar sub-estado"
                  onChange={(value) => updateForm({ subestado: value })}
                />
                {fieldErrors.subestado && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.subestado}
                  </div>
                )}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Fracción *</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.fraccionId ? String(form.fraccionId) : ""}
                  options={fracciones.map(f => {
                    const id = f.idFraccion ?? f.id ?? "";
                    const numero = f.numero ?? id;
                    return { 
                      value: String(id), 
                      label: `Fracción ${numero}` 
                    };
                  })}
                  placeholder={loadingFracciones ? "Cargando..." : "Seleccionar fracción"}
                  onChange={(value) => {
                    const fraccion = fracciones.find(f => `${f.idFraccion ?? f.id}` === value);
                    updateForm({ 
                      fraccionId: value ? Number(value) : "",
                      fraccionNumero: fraccion?.numero ?? ""
                    });
                  }}
                />
                {fieldErrors.fraccionId && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.fraccionId}
                  </div>
                )}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Propietario *</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.propietarioId ? String(form.propietarioId) : ""}
                  options={personaOpts}
                  placeholder={loadingPersonas ? "Cargando..." : "Seleccionar propietario"}
                  onChange={(value) => {
                    updateForm({ 
                      propietarioId: value ? Number(value) : ""
                    });
                  }}
                />
                {fieldErrors.propietarioId && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.propietarioId}
                  </div>
                )}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Calle</div>
              <div className="field-value p0">
                <NiceSelect
                  value={form.calle ?? ""}
                  options={CALLES_OPTIONS}
                  placeholder="Seleccionar calle"
                  onChange={(value) => {
                    updateForm({ calle: value || "" });
                  }}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Número</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="text"
                  value={form.numeroCalle ?? ""}
                  onChange={(e) => updateForm({ numeroCalle: e.target.value })}
                  placeholder="Ej. 202"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Superficie</div>
              <div className="field-value p0">
                <input
                  className="field-input is-readonly"
                  type="number"
                  inputMode="decimal"
                  value={form.superficie ?? ""}
                  readOnly
                  placeholder="Se calcula automáticamente"
                  title="La superficie se calcula automáticamente como frente × fondo"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Frente</div>
              <div className="field-value p0">
                <input
                  className={`field-input ${fieldErrors.frente ? "is-invalid" : ""}`}
                  type="number"
                  inputMode="decimal"
                  value={form.frente ?? ""}
                  onChange={(e) => updateForm({ frente: e.target.value })}
                  placeholder="Metros"
                />
                {fieldErrors.frente && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.frente}
                  </div>
                )}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Fondo</div>
              <div className="field-value p0">
                <input
                  className={`field-input ${fieldErrors.fondo ? "is-invalid" : ""}`}
                  type="number"
                  inputMode="decimal"
                  value={form.fondo ?? ""}
                  onChange={(e) => updateForm({ fondo: e.target.value })}
                  placeholder="Metros"
                />
                {fieldErrors.fondo && (
                  <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                    {fieldErrors.fondo}
                  </div>
                )}
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Precio</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="number"
                  inputMode="decimal"
                  value={form.precio ?? ""}
                  onChange={(e) => updateForm({ precio: e.target.value })}
                  placeholder="USD"
                />
              </div>
            </div>
          </div>

          <div className="lote-media-col">
            {/* Reutilizamos el mismo componente de subida de imágenes en Crear y Editar lote
                para garantizar un comportamiento consistente. */}
            <LoteImageUploader
              images={form.images || []}
              onChange={handleImagesChange}
              inputId="file-input-lote-crear"
            />

            <div className="lote-description">
              <span className="lote-description__icon">ℹ️</span>
              <div className="lote-description__body">
                <strong>Descripción</strong>
                <textarea
                  style={{ 
                    margin: "8px 0 0", 
                    width: "100%", 
                    minHeight: "80px",
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                  value={form.descripcion ?? ""}
                  onChange={(e) =>
                    updateForm({ descripcion: e.target.value })
                  }
                  placeholder="Notas relevantes del lote…"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 18,
              padding: "10px 14px",
              borderRadius: 10,
              background: "#fee2e2",
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

