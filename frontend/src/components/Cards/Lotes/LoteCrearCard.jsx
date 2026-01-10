import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import { createLote } from "../../../lib/api/lotes.js";
import { getAllFracciones } from "../../../lib/api/fracciones.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import { uploadArchivo } from "../../../lib/api/archivos.js";
import { useToast } from "../../../app/providers/ToastProvider.jsx";
import { normNum } from "../../../lib/forms/validate.js";
import { loteCreateSchema } from "../../../lib/validations/loteCreate.schema.js";
import LoteImageUploader from "./LoteImageUploader.jsx";
import { applySearch } from "../../../utils/personaSearch.js";

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
    <div className="ns-wrap">
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

// Estados editables: solo los que se pueden seleccionar manualmente
const ESTADOS_EDITABLES_LOTE = [
  { value: "Disponible", label: "Disponible" },
  { value: "No Disponible", label: "No Disponible" },
  { value: "Vendido", label: "Vendido" },
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
    precio: "",
    descripcion: "",
    nombreEspacioComun: "",
    capacidad: "",
    calle: "",
    numeroCalle: "",
    images: [],
  };
};

export default function LoteCrearCard({
  open,
  onCancel,
  onCreated,
}) {
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fracciones, setFracciones] = useState([]);
  const [loadingFracciones, setLoadingFracciones] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [images, setImages] = useState([]);
  const [busquedaPropietario, setBusquedaPropietario] = useState(null);
  const inputPropietarioRef = useRef(null);
  const dropdownPropietarioRef = useRef(null);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    setError: setFormError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(loteCreateSchema),
    defaultValues: buildInitialForm(),
    mode: "onChange", // Validar al cambiar campos para feedback inmediato
    reValidateMode: "onChange",
  });

  const formValues = watch();

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

  // Obtener la persona seleccionada para mostrar en el input
  const personaSeleccionada = useMemo(() => {
    if (!formValues.propietarioId) return null;
    return personas.find((p) => `${p.id ?? p.idPersona}` === `${formValues.propietarioId}`);
  }, [personas, formValues.propietarioId]);

  // Filtrar personas por búsqueda (reutilizar función del módulo Personas)
  const personasFiltradas = useMemo(() => {
    if (!busquedaPropietario || !busquedaPropietario.trim()) {
      return [];
    }
    return applySearch(personas, busquedaPropietario).slice(0, 10); // Limitar a 10 resultados
  }, [personas, busquedaPropietario]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        inputPropietarioRef.current &&
        !inputPropietarioRef.current.contains(event.target) &&
        dropdownPropietarioRef.current &&
        !dropdownPropietarioRef.current.contains(event.target)
      ) {
        setBusquedaPropietario(null);
      }
    }
    if (busquedaPropietario) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [busquedaPropietario]);

  // Resetear formulario al abrir/cerrar
  useEffect(() => {
    if (!open) {
      reset(buildInitialForm());
      setError(null);
      setShowSuccess(false);
      setSaving(false);
      setImages([]);
      setBusquedaPropietario(null);
      clearErrors();
    }
  }, [open, reset, clearErrors]);

  const handleReset = () => {
    reset(buildInitialForm());
    setError(null);
    setImages([]);
    clearErrors();
  };

  // Callback para manejar cambios en las imágenes
  const handleImagesChange = (newImages) => {
    setImages(newImages);
  };

  const onSubmit = async (data) => {
    // Limpiar solo errores no relacionados con validación del schema
    // Los errores del schema se manejan inline automáticamente
    setError(null);
    clearErrors();

    setSaving(true);
    try {
      // Construir payload desde los datos validados
      const payload = {
        numero: Number(data.numero),
        numPartido: data.numPartido ?? 62,
        tipo: data.tipo,
        estado: data.estado,
        subestado: data.subestado,
        fraccionId: Number(data.fraccionId),
        propietarioId: Number(data.propietarioId),
      };

      // Campos opcionales
      if (data.superficie != null && data.superficie !== "") {
        payload.superficie = Number(data.superficie);
      }
      if (data.precio != null && data.precio !== "") {
        payload.precio = Number(data.precio);
      }
      if (data.descripcion != null && data.descripcion.trim()) {
        payload.descripcion = data.descripcion.trim();
      }
      if (data.calle) {
        payload.calle = data.calle;
      }
      if (data.numeroCalle != null && data.numeroCalle !== "") {
        payload.numeroCalle = Number(data.numeroCalle);
      }

      // Campos específicos para Espacio Comun
      if (data.tipo === "Espacio Comun") {
        if (data.nombreEspacioComun) {
          payload.nombreEspacioComun = data.nombreEspacioComun.trim();
        }
        if (data.capacidad != null && data.capacidad !== "") {
          payload.capacidad = Number(data.capacidad);
        }
      }

      console.log("📤 Payload a enviar:", payload);
      const resp = await createLote(payload);
      const created = resp?.data ?? resp ?? {};
      
      if (!created?.id) {
        throw new Error("El lote se creó pero no se obtuvo el ID");
      }

      // 2. Subir las imágenes si hay
      if (images.length > 0) {
        try {
          const uploadPromises = images
            .filter((img) => img instanceof File)
            .map((file) => uploadArchivo(file, created.id, "IMAGEN"));
          
          await Promise.all(uploadPromises);
        } catch (uploadErr) {
          console.error("Error subiendo imágenes:", uploadErr);
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
      
      // Si es un error de validación del schema (Zod), los errores ya se muestran inline
      // No mostrar mensaje global ni toast para errores de validación del frontend
      if (err?.name === "ZodError" || err?.issues) {
        setError(null); // Asegurar que no haya mensaje global duplicado
        setSaving(false);
        return;
      }
      
      // Si es un error de conflicto (lote duplicado), mostrar mensaje más claro
      if (err?.statusCode === 409 || err?.response?.status === 409) {
        setFormError("numero", {
          type: "manual",
          message: "El lote creado ya existe con ese N° de parcela y fracción.",
        });
        setError(null);
        setSaving(false);
        return;
      }
      
      // Si es un error de validación del backend (400), no mostrar mensaje global
      // Los errores de validación deben mostrarse solo en los campos específicos
      if (err?.statusCode === 400 || err?.response?.status === 400) {
        const errorMsg = err?.message || "Los datos ingresados no son válidos. Verifica los campos obligatorios.";
        // Si el mensaje menciona campos específicos, intentar asignarlo al campo correcto
        if (errorMsg.toLowerCase().includes("precio")) {
          setFormError("precio", {
            type: "manual",
            message: errorMsg,
          });
        }
        setError(null);
        setSaving(false);
        return;
      }
      
      // Solo mostrar mensaje global y toast para errores no relacionados con validación
      const errorMsg = err?.message || "No se pudo crear el lote. Intenta nuevamente.";
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
      <SuccessAnimation show={showSuccess} message="¡Lote creado exitosamente!" />

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
        onSave={handleSubmit(onSubmit)}
        onReset={handleReset}
        saving={saving}
      >
        <div
          className="lote-grid"
          style={{ ["--sale-label-w"]: `${computedLabelWidth}px` }}
        >
          <div className="lote-data-col">
            <div className={`fieldRow ${errors.numero ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">N° de Parcela *</div>
                <div className="field-value p0">
                  <input
                    {...register("numero", { valueAsNumber: true })}
                    className={`field-input ${errors.numero ? "is-invalid" : ""}`}
                    type="number"
                    inputMode="numeric"
                    placeholder="N° de parcela"
                  />
                </div>
              </div>
              {errors.numero && (
                <div className="fieldError">{errors.numero.message}</div>
              )}
            </div>

            <div className={`fieldRow ${errors.numPartido ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">N° de Partida *</div>
                <div className="field-value p0">
                  <input
                    {...register("numPartido", { valueAsNumber: true })}
                    className={`field-input ${errors.numPartido ? "is-invalid" : ""}`}
                    type="number"
                    inputMode="numeric"
                    placeholder="N° de partida"
                  />
                </div>
              </div>
              {errors.numPartido && (
                <div className="fieldError">{errors.numPartido.message}</div>
              )}
            </div>

            <div className={`fieldRow ${errors.tipo ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">Tipo *</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={formValues.tipo ?? ""}
                    options={TIPOS}
                    placeholder="Seleccionar tipo"
                    onChange={(value) => {
                      setValue("tipo", value);
                      // Limpiar campos de espacio común si se cambia a otro tipo
                      if (value !== "Espacio Comun") {
                        setValue("nombreEspacioComun", "");
                        setValue("capacidad", "");
                        clearErrors(["nombreEspacioComun", "capacidad"]);
                      }
                    }}
                  />
                </div>
              </div>
              {errors.tipo && (
                <div className="fieldError">{errors.tipo.message}</div>
              )}
            </div>

            {formValues.tipo === "Espacio Comun" && (
              <>
                <div className={`fieldRow ${errors.nombreEspacioComun ? "hasError" : ""}`}>
                  <div className="field-row">
                    <div className="field-label">Nombre *</div>
                    <div className="field-value p0">
                      <input
                        {...register("nombreEspacioComun")}
                        className={`field-input ${errors.nombreEspacioComun ? "is-invalid" : ""}`}
                        type="text"
                        placeholder="Ej. Piscina"
                      />
                    </div>
                  </div>
                  {errors.nombreEspacioComun && (
                    <div className="fieldError">{errors.nombreEspacioComun.message}</div>
                  )}
                </div>

                <div className={`fieldRow ${errors.capacidad ? "hasError" : ""}`}>
                  <div className="field-row">
                    <div className="field-label">Capacidad</div>
                    <div className="field-value p0">
                      <input
                        {...register("capacidad", { valueAsNumber: true })}
                        className={`field-input ${errors.capacidad ? "is-invalid" : ""}`}
                        type="number"
                        inputMode="numeric"
                        placeholder="Ej. 100"
                      />
                    </div>
                  </div>
                  {errors.capacidad && (
                    <div className="fieldError">{errors.capacidad.message}</div>
                  )}
                </div>
              </>
            )}

            <div className={`fieldRow ${errors.estado ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">Estado *</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={formValues.estado ?? ""}
                    options={ESTADOS_EDITABLES_LOTE}
                    placeholder="Seleccionar estado"
                    onChange={(value) => setValue("estado", value)}
                  />
                </div>
              </div>
              {errors.estado && (
                <div className="fieldError">{errors.estado.message}</div>
              )}
            </div>

            <div className={`fieldRow ${errors.subestado ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">Sub-Estado *</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={formValues.subestado ?? ""}
                    options={SUBESTADOS}
                    placeholder="Seleccionar sub-estado"
                    onChange={(value) => setValue("subestado", value)}
                  />
                </div>
              </div>
              {errors.subestado && (
                <div className="fieldError">{errors.subestado.message}</div>
              )}
            </div>

            <div className={`fieldRow ${errors.fraccionId ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">Fracción *</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={formValues.fraccionId ? String(formValues.fraccionId) : ""}
                    options={fracciones.map(f => {
                      const id = f.idFraccion ?? f.id ?? "";
                      const numero = f.numero ?? f.numeroFraccion ?? id;
                      return { 
                        value: String(id), 
                        label: `Fracción ${numero}` 
                      };
                    })}
                    placeholder={loadingFracciones ? "Cargando..." : "Seleccionar fracción"}
                    onChange={(value) => {
                      const fraccion = fracciones.find(f => `${f.idFraccion ?? f.id}` === value);
                      const fraccionId = value ? Number(value) : "";
                      const fraccionNumero = fraccion?.numero ?? fraccion?.numeroFraccion;
                      
                      setValue("fraccionId", fraccionId || undefined);
                      setValue("fraccionNumero", fraccionNumero ? Number(fraccionNumero) : undefined);
                      
                      // Trigger validation after setting both values
                      if (fraccionId && fraccionNumero) {
                        // Trigger validation for numero field to check range
                        setTimeout(() => {
                          const currentNumero = formValues.numero;
                          if (currentNumero) {
                            // Re-validate numero field with new fraccionNumero
                            setValue("numero", currentNumero, { shouldValidate: true });
                          }
                        }, 100);
                      }
                    }}
                  />
                </div>
              </div>
              {errors.fraccionId && (
                <div className="fieldError">{errors.fraccionId.message}</div>
              )}
            </div>

            <div className={`fieldRow ${errors.propietarioId ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">Propietario *</div>
                <div className="field-value p0">
                  <div ref={inputPropietarioRef} className="propietario-search-wrapper">
                    <div className="propietario-search-input-wrapper">
                      <input
                        className={`field-input ${errors.propietarioId ? "is-invalid" : ""}`}
                        type="text"
                        placeholder={loadingPersonas ? "Cargando..." : "Buscar por nombre, apellido o DNI"}
                        value={
                          busquedaPropietario
                            ? busquedaPropietario
                            : personaSeleccionada
                            ? (() => {
                                const nombre = personaSeleccionada.nombre ?? "";
                                const apellido = personaSeleccionada.apellido ?? "";
                                const razonSocial = personaSeleccionada.razonSocial;
                                return razonSocial || `${nombre} ${apellido}`.trim() || `Persona ${personaSeleccionada.id}`;
                              })()
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setBusquedaPropietario(value);
                          // Si el usuario está escribiendo, limpiar propietarioId si hay texto que no coincide
                          if (value) {
                            if (personaSeleccionada) {
                              const nombre = personaSeleccionada.nombre ?? "";
                              const apellido = personaSeleccionada.apellido ?? "";
                              const razonSocial = personaSeleccionada.razonSocial;
                              const displayText = razonSocial || `${nombre} ${apellido}`.trim();
                              if (!displayText.toLowerCase().includes(value.toLowerCase())) {
                                setValue("propietarioId", "");
                              }
                            }
                          } else {
                            // Si se limpia el texto completamente, limpiar también el propietarioId
                            setValue("propietarioId", "");
                          }
                        }}
                        onFocus={(e) => {
                          // Al hacer focus, si hay persona seleccionada y no hay texto de búsqueda activa, activar modo búsqueda
                          if (personaSeleccionada && !busquedaPropietario) {
                            // Limpiar la selección y activar modo búsqueda
                            setBusquedaPropietario("");
                            setValue("propietarioId", "");
                            // Seleccionar todo el texto para que el usuario pueda reemplazarlo fácilmente
                            setTimeout(() => {
                              e.target.select();
                            }, 0);
                          }
                        }}
                      />
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        className="propietario-search-icon"
                      >
                        <circle cx="11" cy="11" r="7" stroke="#666" strokeWidth="2" fill="none" />
                        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#666" strokeWidth="2" />
                      </svg>
                      <span
                        className="propietario-info-icon-inline"
                        data-tooltip="Si no aparece en la lista, primero registrá a la persona en el módulo Personas."
                      >
                        <Info size={16} />
                      </span>
                    </div>
                    {busquedaPropietario !== null && busquedaPropietario !== undefined && busquedaPropietario !== "" && (
                      <div
                        ref={dropdownPropietarioRef}
                        className="propietario-dropdown"
                      >
                        {personasFiltradas.length === 0 ? (
                          <div className="propietario-dropdown-empty">
                            Sin resultados
                          </div>
                        ) : (
                          personasFiltradas.map((p) => {
                            const id = p.id ?? p.idPersona;
                            const nombre = p.nombre ?? "";
                            const apellido = p.apellido ?? "";
                            const razonSocial = p.razonSocial;
                            const identificadorTipo = p.identificadorTipo;
                            const identificadorValor = p.identificadorValor;
                            const displayText = razonSocial || `${nombre} ${apellido}`.trim() || `Persona ${id}`;
                            return (
                              <button
                                key={id}
                                type="button"
                                className="propietario-dropdown-item"
                                onClick={() => {
                                  setValue("propietarioId", Number(id), { shouldValidate: true });
                                  setBusquedaPropietario(null);
                                  inputPropietarioRef.current?.blur();
                                }}
                              >
                                <div className="propietario-dropdown-item-name">{displayText}</div>
                                {identificadorValor && (
                                  <div className="propietario-dropdown-item-id">
                                    {identificadorTipo ? `${identificadorTipo} ${identificadorValor}` : identificadorValor}
                                  </div>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {errors.propietarioId && (
                <div className="fieldError">{errors.propietarioId.message}</div>
              )}
            </div>

            <div className={`fieldRow ${errors.precio ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">Precio *</div>
                <div className="field-value p0">
                  <input
                    {...register("precio", { valueAsNumber: true })}
                    className={`field-input ${errors.precio ? "is-invalid" : ""}`}
                    type="number"
                    inputMode="decimal"
                    placeholder="USD"
                  />
                </div>
              </div>
              {errors.precio && (
                <div className="fieldError">{errors.precio.message}</div>
              )}
            </div>

            <div className="field-row">
              <div className="field-label">Calle</div>
              <div className="field-value p0">
                <NiceSelect
                  value={formValues.calle ?? ""}
                  options={CALLES_OPTIONS}
                  placeholder="Seleccionar calle"
                  onChange={(value) => {
                    setValue("calle", value || "");
                  }}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">Número</div>
              <div className="field-value p0">
                <input
                  {...register("numeroCalle", { valueAsNumber: true })}
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  placeholder="Ej. 202"
                />
              </div>
            </div>

            <div className={`fieldRow ${errors.superficie ? "hasError" : ""}`}>
              <div className="field-row">
                <div className="field-label">Superficie</div>
                <div className="field-value p0">
                  <input
                    {...register("superficie", { valueAsNumber: true })}
                    className={`field-input ${errors.superficie ? "is-invalid" : ""}`}
                    type="number"
                    inputMode="decimal"
                    placeholder="m²"
                  />
                </div>
              </div>
              {errors.superficie && (
                <div className="fieldError">{errors.superficie.message}</div>
              )}
            </div>
          </div>

          <div className="lote-media-col">
            {/* Reutilizamos el mismo componente de subida de imágenes en Crear y Editar lote
                para garantizar un comportamiento consistente. */}
            <LoteImageUploader
              images={images || []}
              onChange={handleImagesChange}
              inputId="file-input-lote-crear"
            />

            <div className="lote-description">
              <span className="lote-description__icon">ℹ️</span>
              <div className="lote-description__body">
                <strong>Descripción</strong>
                <textarea
                  {...register("descripcion")}
                  className="lote-description-textarea"
                  placeholder="Notas relevantes del lote…"
                />
              </div>
            </div>
          </div>
        </div>

        {error && Object.keys(errors).length === 0 && (
          <div className="lote-error-global">
            {error}
          </div>
        )}
      </EditarBase>
    </>
  );
}

