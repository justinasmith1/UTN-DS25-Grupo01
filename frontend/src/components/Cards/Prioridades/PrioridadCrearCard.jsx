// src/components/Cards/Prioridades/PrioridadCrearCard.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPortal } from "react-dom";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import { createPrioridad } from "../../../lib/api/prioridades.js";
import { getAllLotes } from "../../../lib/api/lotes.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
import { prioridadCreateSchema } from "../../../lib/validations/prioridadCreate.schema.js";

/* -------------------------- Helpers fechas -------------------------- */
function toDateInputValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromDateInputToISO(s, useEndOfDay = false) {
  if (!s || !s.trim()) return null;
  const timeStr = useEndOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  const date = new Date(`${s}${timeStr}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

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
        width: btnRef.current ? `${btnRef.current.offsetWidth}px` : '233px',
        zIndex: 10000,
        maxHeight: '300px',
        overflowY: 'auto',
        backgroundColor: '#fff',
        border: '1px solid rgba(0,0,0,.14)',
        borderRadius: '10px',
        boxShadow: '0 12px 28px rgba(0,0,0,.18)',
        padding: '6px',
        margin: 0,
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
        : menuContent}
    </div>
  );
}

function buildInitialForm(loteIdPreSeleccionado = null) {
  return {
    numero: "",
    loteId: loteIdPreSeleccionado ? String(loteIdPreSeleccionado) : "",
    fechaInicio: toDateInputValue(new Date()),
    fechaFin: toDateInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    inmobiliariaId: "",
  };
}

export default function PrioridadCrearCard({
  open,
  onCancel,
  onCreated,
  loteIdPreSeleccionado,
  entityType = "Prioridad",
}) {
  const { user } = useAuth();
  const isInmobiliaria = user?.role === 'INMOBILIARIA';

  // Estados de datos
  const [lotes, setLotes] = useState([]);
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loadingInmobiliarias, setLoadingInmobiliarias] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [busquedaLote, setBusquedaLote] = useState("");

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
    resolver: zodResolver(prioridadCreateSchema),
    defaultValues: buildInitialForm(loteIdPreSeleccionado),
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const formValues = watch();

  // Cargar lotes disponibles (solo DISPONIBLE o EN_PROMOCION)
  useEffect(() => {
    if (!open) return;

    setLoadingLotes(true);
    (async () => {
      try {
        const resp = await getAllLotes({});
        const lotesData = resp?.data || [];
        const filteredLots = lotesData.filter((l) => {
          const st = String(l.estado || l.status || "").toUpperCase();
          return st === "DISPONIBLE" || st === "EN_PROMOCION";
        });
        setLotes(filteredLots);
      } catch (err) {
        console.error("Error cargando lotes:", err);
        setLotes([]);
      } finally {
        setLoadingLotes(false);
      }
    })();

    if (!isInmobiliaria) {
      setLoadingInmobiliarias(true);
      (async () => {
        try {
          const resp = await getAllInmobiliarias({});
          const inmobData = resp?.data || resp?.inmobiliarias || [];
          const inmobNormalizadas = inmobData.map(i => ({
            value: String(i.id),
            label: i.nombre || `ID: ${i.id}`,
            inmobiliaria: i
          }));
          setInmobiliarias(inmobNormalizadas);
        } catch (err) {
          console.error("Error cargando inmobiliarias:", err);
          setInmobiliarias([]);
        } finally {
          setLoadingInmobiliarias(false);
        }
      })();
    } else {
      setInmobiliarias([]);
    }

    setBusquedaLote("");
  }, [open, isInmobiliaria]);

  // Resetear formulario cuando se cierra o cambia loteIdPreSeleccionado
  useEffect(() => {
    if (!open) {
      reset(buildInitialForm(loteIdPreSeleccionado));
      setBusquedaLote("");
      setSaving(false);
      setShowSuccess(false);
    } else if (loteIdPreSeleccionado) {
      setValue("loteId", String(loteIdPreSeleccionado));
    }
  }, [open, loteIdPreSeleccionado, reset, setValue]);

  // Filtrar lotes según búsqueda
  const lotesFiltrados = useMemo(() => {
    const q = busquedaLote.trim().toLowerCase();
    if (!q) return [];
    return lotes.filter((l) => {
      const fraccion = String(l?.fraccion?.numero || "").toLowerCase();
      const numero = String(l.numero || "").toLowerCase();
      const mapId = String(l.mapId || "").toLowerCase();
      const id = String(l.id || "").toLowerCase();
      const textoLote = `lote ${fraccion}-${numero}`.toLowerCase();
      return mapId.includes(q) || numero.includes(q) || id.includes(q) || textoLote.includes(q) || fraccion.includes(q);
    });
  }, [busquedaLote, lotes]);

  // Calcular ancho de labels
  const LABELS = ["N° PRIORIDAD", "LOTE", "FECHA", "FECHA FIN", "INMOBILIARIA"];
  const computedLabelWidth = Math.min(260, Math.max(160, Math.round(Math.max(...LABELS.map(l => l.length)) * 8.2) + 22));

  // Opciones de inmobiliaria para el select (ADMIN/GESTOR)
  const inmobiliariaOpts = useMemo(() => {
    if (isInmobiliaria) return [];
    const hasLF = inmobiliarias.some(i => (i.label || "").toLowerCase().includes("la federala"));
    const opts = hasLF 
      ? inmobiliarias 
      : [{ value: "La Federala", label: "La Federala" }, ...inmobiliarias];
    return opts;
  }, [inmobiliarias, isInmobiliaria]);

  const onSubmit = async (data) => {
    clearErrors();
    setShowSuccess(false);
    setSaving(true);

    try {
      const fechaInicioISO = fromDateInputToISO(data.fechaInicio);
      const fechaFinISO = fromDateInputToISO(data.fechaFin, true);

      let ownerType = null;
      let inmobiliariaIdFinal = null;

      if (isInmobiliaria) {
        // INMOBILIARIA: el backend toma desde JWT
      } else {
        if (data.inmobiliariaId && data.inmobiliariaId.trim()) {
          const inmobValue = data.inmobiliariaId.trim();
          if (inmobValue === "La Federala" || inmobValue.toLowerCase().includes("federala")) {
            ownerType = "CCLF";
            inmobiliariaIdFinal = null;
          } else {
            ownerType = "INMOBILIARIA";
            inmobiliariaIdFinal = Number(inmobValue);
          }
        }
      }

      const payload = {
        numero: data.numero.trim(),
        loteId: Number(data.loteId),
        fechaInicio: fechaInicioISO,
        fechaFin: fechaFinISO,
        ...(ownerType ? { ownerType } : {}),
        ...(inmobiliariaIdFinal != null ? { inmobiliariaId: inmobiliariaIdFinal } : {}),
      };

      const response = await createPrioridad(payload);

      if (!response || !response.success) {
        throw new Error(response?.message || "Error al crear la prioridad");
      }

      setShowSuccess(true);
      onCreated?.(response.data);

      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (err) {
      // Si es un error de validación del schema (Zod), los errores ya se muestran inline
      if (err?.name === "ZodError" || err?.issues) {
        setSaving(false);
        return;
      }

      // Si es un error de conflicto (numero duplicado), mostrar en el campo numero
      if (err?.statusCode === 409 || err?.response?.status === 409) {
        const errorMsg = err?.message || err?.response?.data?.message || "";
        if (errorMsg.toLowerCase().includes('numero') || errorMsg.toLowerCase().includes('número') || errorMsg.toLowerCase().includes('ya existe')) {
          setFormError("numero", {
            type: "manual",
            message: "Ya existe una prioridad con este número",
          });
        } else {
          setFormError("numero", {
            type: "manual",
            message: errorMsg || "El número de prioridad ya existe",
          });
        }
        setSaving(false);
        return;
      }

      // Si es un error de validación del backend (400), no mostrar mensaje global
      if (err?.statusCode === 400 || err?.response?.status === 400) {
        const errorMsg = err?.message || "Los datos ingresados no son válidos. Verifica los campos obligatorios.";
        if (errorMsg.toLowerCase().includes('numero')) {
          setFormError("numero", {
            type: "manual",
            message: errorMsg,
          });
        }
        setSaving(false);
        return;
      }

      // Solo mostrar mensaje global para errores no relacionados con validación
      setFormError("root", {
        type: "manual",
        message: err?.message || "No se pudo crear la prioridad. Intenta nuevamente.",
      });
      setSaving(false);
    }
  };

  const handleReset = () => {
    reset(buildInitialForm(loteIdPreSeleccionado));
    setBusquedaLote("");
    clearErrors();
  };

  const shouldRender = open || showSuccess;
  if (!shouldRender) return null;

  const loteIdValue = formValues.loteId || "";
  const loteSeleccionado = lotes.find(l => String(l.id) === String(loteIdValue));
  const loteDisplayText = loteIdValue && !busquedaLote && loteSeleccionado ? (() => {
    const fraccion = loteSeleccionado?.fraccion?.numero;
    const numero = loteSeleccionado?.numero;
    if (fraccion != null && numero != null) {
      return `Lote ${fraccion}-${numero}`;
    }
    const mapId = loteSeleccionado.mapId;
    return String(mapId).toLowerCase().startsWith('lote') ? mapId : `Lote ${mapId}`;
  })() : busquedaLote;

  return (
    <>
      <SuccessAnimation show={showSuccess} message={`¡${entityType} creada exitosamente!`} />

      <EditarBase
        open={open}
        title="Registrar Prioridad"
        onCancel={() => {
          if (showSuccess) return;
          setShowSuccess(false);
          setSaving(false);
          onCancel?.();
        }}
        onSave={handleSubmit(onSubmit)}
        onReset={handleReset}
        saving={saving}
        saveButtonText="Confirmar Prioridad"
        headerRight={(loadingLotes || (!isInmobiliaria && loadingInmobiliarias)) ? <span className="badge bg-warning text-dark">Cargando...</span> : null}
      >
        <div>
          <h3 className="venta-section-title" style={{ paddingBottom: "6px", marginBottom: "18px" }}>
            Información de la Prioridad
          </h3>

          {errors.root && (
            <div style={{ padding: "12px", marginBottom: "18px", background: "#fee", border: "1px solid #fcc", borderRadius: "6px", color: "#c00" }}>
              {errors.root.message}
            </div>
          )}

          <div
            className="venta-grid"
            style={{ ["--sale-label-w"]: `${computedLabelWidth}px` }}
          >
            {/* Columna izquierda */}
            <div className="venta-col">
              <div className={`fieldRow ${errors.loteId ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">LOTE</div>
                  <div className="field-value p0" style={{ alignItems: "flex-start" }}>
                    <div style={{ width: "100%", position: "relative" }}>
                      <div style={{ position: "relative" }}>
                        <input
                          type="hidden"
                          {...register("loteId")}
                        />
                        <input
                          className={`field-input ${errors.loteId ? "is-invalid" : ""}`}
                          placeholder={loteIdValue ? "" : "Buscar lote por número o fracción"}
                          value={loteDisplayText}
                          onChange={(e) => {
                            setBusquedaLote(e.target.value);
                            if (e.target.value && loteIdValue) {
                              setValue("loteId", "");
                            }
                          }}
                          onFocus={() => {
                            if (loteIdValue) {
                              setBusquedaLote("");
                              setValue("loteId", "");
                            }
                          }}
                        />
                        <svg width="18" height="18" viewBox="0 0 24 24" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", opacity: .6 }}>
                          <circle cx="11" cy="11" r="7" stroke="#666" strokeWidth="2" fill="none"/>
                          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#666" strokeWidth="2"/>
                        </svg>
                      </div>
                      {busquedaLote && (
                        <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto", overflowX: "hidden", border: "1px solid #e5e7eb", borderRadius: 8, position: "absolute", width: "100%", zIndex: 1000, background: "#fff" }}>
                          {lotesFiltrados.length === 0 && (
                            <div style={{ padding: 10, color: "#6b7280" }}>No se encontraron lotes</div>
                          )}
                          {lotesFiltrados.map((l) => {
                            const fraccion = l?.fraccion?.numero;
                            const numero = l?.numero;
                            const displayText = (fraccion != null && numero != null) 
                              ? `Lote ${fraccion}-${numero}`
                              : (l.mapId || `Lote ID: ${l.id}`);
                            return (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => { 
                                  setValue("loteId", String(l.id)); 
                                  setBusquedaLote(""); 
                                  clearErrors("loteId");
                                }}
                                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "#fff", border: "none", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                                onMouseEnter={(e) => e.target.style.background = "#f9fafb"}
                                onMouseLeave={(e) => e.target.style.background = "#fff"}
                              >
                                {displayText} <span style={{ color: "#6b7280" }}>({String(l.estado || l.status)})</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {errors.loteId && (
                  <div className="fieldError">{errors.loteId.message}</div>
                )}
              </div>

              <div className={`fieldRow ${errors.fechaInicio ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">FECHA</div>
                  <div className="field-value p0">
                    <input
                      {...register("fechaInicio")}
                      className={`field-input ${errors.fechaInicio ? "is-invalid" : ""}`}
                      type="date"
                    />
                  </div>
                </div>
                {errors.fechaInicio && (
                  <div className="fieldError">{errors.fechaInicio.message}</div>
                )}
              </div>
            </div>

            {/* Columna derecha */}
            <div className="venta-col">
              <div className={`fieldRow ${errors.numero ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">N° PRIORIDAD</div>
                  <div className="field-value p0">
                    <input
                      {...register("numero")}
                      className={`field-input ${errors.numero ? "is-invalid" : ""}`}
                      type="text"
                      placeholder="Ej: PRI-2026-01"
                    />
                  </div>
                </div>
                {errors.numero && (
                  <div className="fieldError">{errors.numero.message}</div>
                )}
              </div>

              <div className={`fieldRow ${errors.fechaFin ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">VENCIMIENTO</div>
                  <div className="field-value p0">
                    <input
                      {...register("fechaFin")}
                      className={`field-input ${errors.fechaFin ? "is-invalid" : ""}`}
                      type="date"
                    />
                  </div>
                </div>
                {errors.fechaFin && (
                  <div className="fieldError">{errors.fechaFin.message}</div>
                )}
              </div>
            </div>
          </div>

          {/* Fila 3: INMOBILIARIA (solo ADMIN/GESTOR) */}
          {!isInmobiliaria && (
            <div
              className="venta-grid"
              style={{ ["--sale-label-w"]: `${computedLabelWidth}px`, marginTop: "24px" }}
            >
              <div className="venta-col">
                <div className={`fieldRow ${errors.inmobiliariaId ? "hasError" : ""}`}>
                  <div className="field-row">
                    <div className="field-label">INMOBILIARIA</div>
                    <div className="field-value p0">
                      <input
                        type="hidden"
                        {...register("inmobiliariaId")}
                      />
                      <NiceSelect
                        value={formValues.inmobiliariaId || ""}
                        options={inmobiliariaOpts}
                        placeholder="Seleccionar inmobiliaria (opcional)"
                        onChange={(val) => {
                          setValue("inmobiliariaId", val || "");
                          clearErrors("inmobiliariaId");
                        }}
                        usePortal={true}
                      />
                    </div>
                  </div>
                  {errors.inmobiliariaId && (
                    <div className="fieldError">{errors.inmobiliariaId.message}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </EditarBase>
    </>
  );
}
