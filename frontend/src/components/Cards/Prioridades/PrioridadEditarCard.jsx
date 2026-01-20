// src/components/Cards/Prioridades/PrioridadEditarCard.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import NiceSelect from "../../Base/NiceSelect.jsx";
import { getPrioridadById, updatePrioridad, cancelPrioridad, finalizePrioridad } from "../../../lib/api/prioridades.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";
import { canEditByEstadoOperativo, isEliminado } from "../../../utils/estadoOperativo";

/** Estados editables de prioridad: solo FINALIZADA y CANCELADA (no EXPIRADA manualmente) */
const ESTADOS_PRIORIDAD = [
  { value: "ACTIVA", label: "Activa" },
  { value: "FINALIZADA", label: "Finalizada" },
  { value: "CANCELADA", label: "Cancelada" },
];

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


export default function PrioridadEditarCard({
  open,
  prioridad,
  prioridadId,
  prioridades,
  onCancel,
  onSaved,
  entityType = "Prioridad",
}) {
  const { user } = useAuth();
  const isInmobiliaria = user?.role === 'INMOBILIARIA';
  const [detalle, setDetalle] = useState(prioridad || null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inmobiliarias, setInmobiliarias] = useState([]);

  const [labelW, setLabelW] = useState(180);
  const containerRef = useRef(null);

  /* GET de prioridad al abrir */
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) return;

      const idToUse = prioridad?.id ?? prioridadId;

      if (idToUse != null) {
        try {
          const response = await getPrioridadById(idToUse);
          const full = response?.data ?? response;
          if (!abort && full) {
            setDetalle(full);
          }
        } catch (e) {
          console.error("Error obteniendo prioridad por id:", e);
          if (prioridad && !abort) {
            setDetalle(prioridad);
          } else if (prioridadId != null && Array.isArray(prioridades) && !abort) {
            const found = prioridades.find(p => `${p.id}` === `${prioridadId}`);
            if (found) {
              setDetalle(found);
            }
          }
        }
      } else if (prioridad) {
        if (!abort) setDetalle(prioridad);
      }
    }
    run();
    return () => { abort = true; };
  }, [open, prioridadId, prioridades, prioridad?.id]);

  /* Cargar inmobiliarias solo si es ADMIN/GESTOR */
  useEffect(() => {
    if (!open || isInmobiliaria) {
      setInmobiliarias([]);
      return;
    }

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
      }
    })();
  }, [open, isInmobiliaria]);

  /* Resetear estados */
  useEffect(() => {
    if (!open) {
      setSaving(false);
      setShowSuccess(false);
    }
  }, [open, detalle?.id]);

  /* STATES EDITABLES */
  const fechaInicioISO = detalle?.fechaInicio ?? null;
  const fechaFinISO = detalle?.fechaFin ?? null;
  const base = {
    numero: detalle?.numero ?? "",
    fechaInicio: toDateInputValue(fechaInicioISO),
    fechaFin: toDateInputValue(fechaFinISO),
    estado: String(detalle?.estado ?? "ACTIVA"),
    inmobiliariaId: detalle?.inmobiliariaId ? String(detalle.inmobiliariaId) : (detalle?.ownerType === 'CCLF' ? "La Federala" : ""),
  };

  const [numero, setNumero] = useState(base.numero);
  const [numeroError, setNumeroError] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(base.fechaInicio);
  const [fechaFin, setFechaFin] = useState(base.fechaFin);
  const [estado, setEstado] = useState(base.estado);
  const [inmobiliariaId, setInmobiliariaId] = useState(base.inmobiliariaId);

  // re-sync cuando cambia 'detalle'
  useEffect(() => {
    if (!open || !detalle) return;
    setNumero(base.numero);
    setNumeroError(null);
    setFechaInicio(base.fechaInicio);
    setFechaFin(base.fechaFin);
    setEstado(base.estado);
    setInmobiliariaId(base.inmobiliariaId);
  }, [open, detalle?.id]);

  /* Estados disponibles (no permitir EXPIRADA manualmente) */
  const estadosDisponibles = useMemo(() => {
    const estadoActual = String(detalle?.estado ?? "").toUpperCase();
    
    // Si ya está FINALIZADA/CANCELADA/EXPIRADA, solo mostrar ese estado (read-only)
    if (estadoActual === "FINALIZADA" || estadoActual === "CANCELADA" || estadoActual === "EXPIRADA") {
      return ESTADOS_PRIORIDAD.filter(e => e.value === estadoActual);
    }
    
    // Si está ACTIVA, permitir cambiar a FINALIZADA o CANCELADA
    if (estadoActual === "ACTIVA") {
      return ESTADOS_PRIORIDAD.filter(e => 
        e.value === "ACTIVA" || e.value === "FINALIZADA" || e.value === "CANCELADA"
      );
    }
    
    return ESTADOS_PRIORIDAD;
  }, [detalle?.estado]);

  // Opciones de inmobiliaria para el select (ADMIN/GESTOR)
  const inmobiliariaOpts = useMemo(() => {
    if (isInmobiliaria) return [];
    // "La Federala" + inmobiliarias reales
    const hasLF = inmobiliarias.some(i => (i.label || "").toLowerCase().includes("la federala"));
    const opts = hasLF 
      ? inmobiliarias 
      : [{ value: "La Federala", label: "La Federala" }, ...inmobiliarias];
    return opts;
  }, [inmobiliarias, isInmobiliaria]);

  /* ancho de label - mismo orden que Ver */
  useEffect(() => {
    const labels = ["LOTE", "ESTADO", "FECHA INICIO", "N° PRIORIDAD", "INMOBILIARIA", "VENCIMIENTO"];
    const longest = Math.max(...labels.map(s => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, detalle?.id]);

  /* Guardado */
  async function handleSave() {
    if (!detalle?.id) return;
    
    // Bloquear guardado si está eliminada
    if (estaEliminada) {
      setNumeroError("No se puede editar una prioridad eliminada. Reactívala para modificarla.");
      return;
    }

    setSaving(true);
    setShowSuccess(false);
    setNumeroError(null);

    try {
      const estadoActual = String(detalle?.estado ?? "").toUpperCase();
      const nuevoEstado = String(estado).toUpperCase();
      const numeroActual = detalle?.numero ?? "";
      const nuevoNumero = numero.trim();
      const inmobiliariaIdActual = detalle?.inmobiliariaId ?? null;
      const nuevoInmobiliariaIdValue = inmobiliariaId === "" || inmobiliariaId === "La Federala" ? null : (inmobiliariaId ? Number(inmobiliariaId) : null);
      // Normalizar fechaFin actual a ISO (con end of day para comparación consistente)
      const fechaFinActualISOFormatted = fechaFinISO ? (() => {
        const date = new Date(fechaFinISO);
        if (Number.isNaN(date.getTime())) return null;
        // Normalizar a end of day para comparación consistente
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString();
      })() : null;
      const nuevoFechaFinISO = fromDateInputToISO(fechaFin, true);

      // Detectar cambios
      const cambioEstado = estadoActual !== nuevoEstado;
      const cambioNumero = nuevoNumero !== numeroActual;
      const cambioInmobiliaria = nuevoInmobiliariaIdValue !== inmobiliariaIdActual;
      const cambioFechaFin = nuevoFechaFinISO && fechaFinActualISOFormatted && nuevoFechaFinISO !== fechaFinActualISOFormatted;

      // Si no hay cambios, cerrar sin animación
      if (!cambioEstado && !cambioNumero && !cambioInmobiliaria && !cambioFechaFin) {
        setSaving(false);
        onCancel?.();
        return;
      }

      // Validar fechaFin si cambió
      if (cambioFechaFin && (user?.role === 'ADMINISTRADOR' || user?.role === 'GESTOR')) {
        const fechaFinDate = new Date(nuevoFechaFinISO);
        const fechaInicioDate = new Date(detalle.fechaInicio);
        const now = new Date();

        if (fechaFinDate <= fechaInicioDate) {
          setNumeroError("La fecha de vencimiento debe ser posterior a la fecha de inicio");
          setSaving(false);
          return;
        }

        if (fechaFinDate <= now) {
          setNumeroError("La fecha de vencimiento debe ser posterior a la fecha actual");
          setSaving(false);
          return;
        }
      }

      // Actualizar numero, inmobiliariaId y fechaFin si cambiaron (vía updatePrioridad)
      if (cambioNumero || cambioInmobiliaria || cambioFechaFin) {
        const updatePayload = {};
        if (cambioNumero) {
          updatePayload.numero = nuevoNumero;
        }
        if (cambioInmobiliaria && (user?.role === 'ADMINISTRADOR' || user?.role === 'GESTOR')) {
          updatePayload.inmobiliariaId = nuevoInmobiliariaIdValue;
        }
        if (cambioFechaFin && (user?.role === 'ADMINISTRADOR' || user?.role === 'GESTOR')) {
          updatePayload.fechaFin = nuevoFechaFinISO;
        }

        try {
          await updatePrioridad(detalle.id, updatePayload);
        } catch (e) {
          // Manejar error de unicidad de numero
          if (e?.response?.status === 409 || e?.message?.toLowerCase().includes('numero') || e?.message?.toLowerCase().includes('número')) {
            setNumeroError("Ya existe una prioridad con este número");
            setSaving(false);
            return;
          }
          // Manejar errores de validación de fecha
          if (e?.response?.status === 400 && (e?.message?.toLowerCase().includes('fecha') || e?.message?.toLowerCase().includes('vencimiento'))) {
            setNumeroError(e.message || "La fecha de vencimiento no es válida");
            setSaving(false);
            return;
          }
          throw e;
        }
      }

      // Cambiar estado si cambió (usar endpoints específicos)
      if (cambioEstado) {
        if (nuevoEstado === "FINALIZADA") {
          await finalizePrioridad(detalle.id);
        } else if (nuevoEstado === "CANCELADA") {
          await cancelPrioridad(detalle.id);
        }
      }

      setShowSuccess(true);
      
      // Recargar datos actualizados
      const response = await getPrioridadById(detalle.id);
      const updated = response?.data ?? response;
      if (updated) {
        setDetalle(updated);
      }
      
      onSaved?.(updated || detalle);

      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (e) {
      console.error("Error guardando prioridad:", e);
      setSaving(false);
    }
  }

  const handleReset = () => {
    if (!detalle) return;
    setNumero(base.numero);
    setNumeroError(null);
    setFechaInicio(base.fechaInicio);
    setFechaFin(base.fechaFin);
    setEstado(base.estado);
    setInmobiliariaId(base.inmobiliariaId);
  };

  const NA = "Sin información";

  const loteInfo = (() => {
    if (detalle?.lote) {
      const fraccion = detalle.lote?.fraccion?.numero;
      const numero = detalle.lote?.numero;
      if (fraccion != null && numero != null) {
        return `Lote ${fraccion}-${numero}`;
      }
      if (detalle.lote?.mapId) {
        const mapId = String(detalle.lote.mapId);
        return mapId.toLowerCase().startsWith('lote') ? mapId : `Lote ${mapId}`;
      }
    }
    return detalle?.loteId ? `Lote ID: ${detalle.loteId}` : NA;
  })();

  const isReadOnly = String(detalle?.estado ?? "").toUpperCase() === "FINALIZADA" || 
                     String(detalle?.estado ?? "").toUpperCase() === "CANCELADA" ||
                     String(detalle?.estado ?? "").toUpperCase() === "EXPIRADA";
  
  const estaEliminada = isEliminado(detalle);
  const puedeEditar = canEditByEstadoOperativo(detalle);

  if (!open || !detalle) return null;

  return (
    <>
      <SuccessAnimation show={showSuccess} message={`¡${entityType} guardada exitosamente!`} />

      <EditarBase
        open={open}
        title={`Prioridad N° ${numero || detalle?.numero || (detalle?.id != null ? `PRI-${String(detalle.id).padStart(6, '0')}` : "—")}`}
        onCancel={() => {
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
        saveButtonText={estaEliminada ? null : "Guardar cambios"}
      >
        <div style={{ "--sale-label-w": `${labelW}px` }}>
          {estaEliminada && (
            <div 
              className="alert alert-warning" 
              style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem 1rem',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '0.375rem',
                color: '#92400e'
              }}
            >
              <strong>Prioridad eliminada:</strong> No se puede editar una prioridad eliminada. Reactívala para modificarla.
            </div>
          )}
          
          <h3 className="venta-section-title">Información de la prioridad</h3>

          <div className="venta-grid" ref={containerRef}>
            {/* Columna izquierda - mismo orden que Ver */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">LOTE</div>
                <div className="field-value is-readonly">{loteInfo}</div>
              </div>

              <div className="field-row">
                <div className="field-label">ESTADO</div>
                  <div className="field-value p0">
                  <NiceSelect
                    value={estado}
                    options={estadosDisponibles}
                    placeholder=""
                    showPlaceholderOption={false}
                    onChange={setEstado}
                    disabled={isReadOnly || estaEliminada}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">FECHA INICIO</div>
                <div className="field-value is-readonly">{fechaInicio || NA}</div>
              </div>
            </div>

            {/* Columna derecha - mismo orden que Ver */}
            <div className="venta-col">
              <div className={`fieldRow ${numeroError ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">N° PRIORIDAD</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${numeroError ? "is-invalid" : ""} ${estaEliminada ? "is-readonly" : ""}`}
                      type="text"
                      value={numero}
                      onChange={(e) => {
                        if (!estaEliminada) {
                          setNumero(e.target.value);
                          if (numeroError) setNumeroError(null);
                        }
                      }}
                      placeholder="Ej: PRI-2026-01"
                      disabled={estaEliminada}
                      readOnly={estaEliminada}
                    />
                  </div>
                </div>
                {numeroError && (
                  <div className="fieldError">{numeroError}</div>
                )}
              </div>

              <div className="field-row">
                <div className="field-label">INMOBILIARIA</div>
                {isInmobiliaria ? (
                  <div className="field-value is-readonly">
                    {detalle?.inmobiliaria?.nombre || (detalle?.ownerType === 'CCLF' ? 'La Federala' : NA)}
                  </div>
                ) : (
                  <div className="field-value p0">
                    <NiceSelect
                      value={inmobiliariaId || ""}
                      options={inmobiliariaOpts}
                      placeholder="Seleccionar inmobiliaria"
                      showPlaceholderOption={false}
                      onChange={(val) => !estaEliminada && setInmobiliariaId(val || "")}
                      disabled={estaEliminada}
                    />
                  </div>
                )}
              </div>

              <div className="field-row">
                <div className="field-label">VENCIMIENTO</div>
                {isInmobiliaria ? (
                  <div className="field-value is-readonly">{fechaFin || NA}</div>
                ) : (
                  <div className="field-value p0">
                    <input
                      className={`field-input ${estaEliminada ? "is-readonly" : ""}`}
                      type="date"
                      value={fechaFin}
                      onChange={(e) => !estaEliminada && setFechaFin(e.target.value)}
                      disabled={estaEliminada}
                      readOnly={estaEliminada}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </EditarBase>
    </>
  );
}
