// src/components/Cards/Reservas/ReservaCrearCard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import { createReserva } from "../../../lib/api/reservas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import { getAllLotes } from "../../../lib/api/lotes.js";
import PersonaCrearCard from "../Personas/PersonaCrearCard.jsx";
import { useAuth } from "../../../app/providers/AuthProvider.jsx";

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

function fromDateInputToISO(s) {
  if (!s || !s.trim()) return null;
  const date = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/* ----------------------- Select custom sin librerías ----------------------- */
function NiceSelect({ value, options, placeholder = "Seleccionar", onChange }) {
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
      )}
    </div>
  );
}

/* ========================================================================== */
export default function ReservaCrearCard({
  open,
  onCancel,
  onCreated,
  loteIdPreSeleccionado, // Opcional: si viene desde el módulo de lotes
  entityType = "Reserva",
  fromSidePanel = false, // Si viene del side panel, el lote debe estar freezado
  lockLote = false, // Si viene desde fila del tablero, bloquear el campo lote
}) {
  const { user } = useAuth();
  const isInmobiliaria = user?.role === 'INMOBILIARIA';

  // Estados de formulario
  const [fechaReserva, setFechaReserva] = useState(toDateInputValue(new Date()));
  const [loteId, setLoteId] = useState(loteIdPreSeleccionado ? String(loteIdPreSeleccionado) : "");
  const [clienteId, setClienteId] = useState("");
  const [inmobiliariaId, setInmobiliariaId] = useState("");
  const [plazoReserva, setPlazoReserva] = useState(toDateInputValue(new Date()));
  const [sena, setSena] = useState("");
  const [numero, setNumero] = useState(""); // Número de reserva editable
  const [numeroError, setNumeroError] = useState(null); // Error de validación de numero

  // Estados de datos
  const [lotes, setLotes] = useState([]);
  const [personas, setPersonas] = useState([]); // Guardar como objetos, no como opciones
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [loadingInmobiliarias, setLoadingInmobiliarias] = useState(false);

  // Estados de UI
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [openCrearPersona, setOpenCrearPersona] = useState(false);
  const [busquedaLote, setBusquedaLote] = useState("");

  // Calcular el mapId del lote seleccionado cuando viene del side panel o desde fila
  const loteSeleccionadoMapId = useMemo(() => {
    if ((!fromSidePanel && !lockLote) || !loteId) return null;
    const loteSeleccionado = lotes.find(l => String(l.id) === String(loteId));
    if (!loteSeleccionado) return null;
    const mapId = loteSeleccionado.mapId;
    if (!mapId) return null;
    return String(mapId).toLowerCase().startsWith('lote') ? mapId : `Lote ${mapId}`;
  }, [fromSidePanel, lockLote, loteId, lotes]);

  // Cargar datos al abrir
  useEffect(() => {
    if (!open) return;

    // Cargar lotes disponibles (solo DISPONIBLE)
    setLoadingLotes(true);
    (async () => {
      try {
        const resp = await getAllLotes({});
        const lotesData = resp?.data || [];
        // Filtrar solo lotes DISPONIBLE
        let filteredLots = lotesData.filter((l) => {
          const st = String(l.estado || l.status || "").toUpperCase();
          return st === "DISPONIBLE";
        });
        
        // Si lockLote es true y hay loteIdPreSeleccionado, asegurar que el lote esté en el array
        if (lockLote && loteIdPreSeleccionado) {
          const lotePrecargado = lotesData.find(l => String(l.id) === String(loteIdPreSeleccionado));
          if (lotePrecargado && !filteredLots.find(l => String(l.id) === String(lotePrecargado.id))) {
            filteredLots = [lotePrecargado, ...filteredLots];
          }
        }
        
        setLotes(filteredLots);
      } catch (err) {
        console.error("Error cargando lotes:", err);
        setLotes([]);
      } finally {
        setLoadingLotes(false);
      }
    })();

    // Cargar personas (siempre, para todos los roles incluyendo INMOBILIARIA)
    setLoadingPersonas(true);
    (async () => {
      try {
        const resp = await getAllPersonas({});
        const personasData = resp?.personas ?? resp?.data ?? (Array.isArray(resp) ? resp : []);
        setPersonas(Array.isArray(personasData) ? personasData : []);
      } catch (err) {
        console.error("Error cargando personas:", err);
        setPersonas([]);
      } finally {
        setLoadingPersonas(false);
      }
    })();

    // Resetear búsqueda de lote al abrir
    setBusquedaLote("");

    // Cargar inmobiliarias solo si NO es INMOBILIARIA
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
    }
  }, [open, isInmobiliaria]);

  // Resetear cuando se cierra (pero mantener loteId si viene precargado)
  useEffect(() => {
    if (!open) {
      setFechaReserva(toDateInputValue(new Date()));
      setClienteId("");
      setInmobiliariaId("");
      setPlazoReserva(toDateInputValue(new Date()));
      setSena("");
      setNumero("");
      setNumeroError(null);
      setError(null);
      setShowSuccess(false);
      setSaving(false);
      setBusquedaLote("");
      // Solo resetear loteId si no viene precargado
      if (!loteIdPreSeleccionado) {
        setLoteId("");
      }
    } else if (loteIdPreSeleccionado) {
      // Cuando se abre y hay loteIdPreSeleccionado, setearlo
      setLoteId(String(loteIdPreSeleccionado));
    }
  }, [open, loteIdPreSeleccionado]);

  // Filtrar lotes según búsqueda - igual que en VentaCrearCard (por mapId, numero, id, textoLote, calle)
  const lotesFiltrados = useMemo(() => {
    const q = busquedaLote.trim().toLowerCase();
    if (!q) return [];
    return lotes.filter((l) => {
      const mapId = String(l.mapId || "").toLowerCase();
      const numero = String(l.numero || "").toLowerCase();
      const id = String(l.id || l.loteId || "").toLowerCase();
      const textoLote = `Lote ${l.mapId || l.numero || l.id}`.toLowerCase();
      const calle = String(l.ubicacion?.calle || l.location || "").toLowerCase();
      return mapId.includes(q) || numero.includes(q) || id.includes(q) || textoLote.includes(q) || calle.includes(q);
    });
  }, [busquedaLote, lotes]);

  // Opciones de personas para el selector (igual que en VentaCrearCard)
  const personaOpts = useMemo(
    () => personas.map((p) => ({
      value: String(p.id ?? p.idPersona ?? ""),
      label: `${p.nombreCompleto || `${p.nombre || ""} ${p.apellido || ""}`.trim() || `ID: ${p.id}`}`,
      persona: p
    })),
    [personas]
  );

  // Handler para cuando se crea una nueva persona
  const handlePersonaCreated = (nuevaPersona) => {
    // Agregar la nueva persona a la lista (como objeto, igual que en VentaCrearCard)
    setPersonas(prev => [nuevaPersona, ...prev]);
    // Seleccionar automáticamente la nueva persona
    setClienteId(String(nuevaPersona.id));
    setOpenCrearPersona(false);
  };

  // Calcular ancho de labels
  const LABELS = ["N° RESERVA", "LOTE", "FECHA RESERVA", "COMPRADOR", "INMOBILIARIA", "PLAZO RESERVA", "MONTO RESERVA/SEÑA"];
  const computedLabelWidth = Math.min(260, Math.max(160, Math.round(Math.max(...LABELS.map(l => l.length)) * 8.2) + 22));

  async function handleSave() {
    setError(null);
    setNumeroError(null);
    setSaving(true);

    // Validaciones
    const numeroTrim = String(numero || "").trim();
    if (!numeroTrim || numeroTrim.length < 3 || numeroTrim.length > 30) {
      setNumeroError("Número de reserva obligatorio (3 a 30 caracteres)");
      setSaving(false);
      return;
    }

    if (!fechaReserva || !fechaReserva.trim()) {
      setError("La fecha de reserva es obligatoria.");
      setSaving(false);
      return;
    }

    if (!loteId || !loteId.trim()) {
      setError("El lote es obligatorio.");
      setSaving(false);
      return;
    }

    if (!clienteId || !clienteId.trim()) {
      setError("El cliente es obligatorio.");
      setSaving(false);
      return;
    }

    if (!plazoReserva || !plazoReserva.trim()) {
      setError("El plazo de reserva es obligatorio.");
      setSaving(false);
      return;
    }

    // Validar seña si se ingresó
    let senaNum = null;
    if (sena && sena.trim()) {
      const n = Number(sena);
      if (!Number.isFinite(n) || n < 0) {
        setError("La seña debe ser un número ≥ 0.");
        setSaving(false);
        return;
      }
      senaNum = n;
    }

    try {
      const fechaISO = fromDateInputToISO(fechaReserva);
      if (!fechaISO) {
        setError("La fecha de reserva es inválida.");
        setSaving(false);
        return;
      }

      const fechaFinISO = fromDateInputToISO(plazoReserva);
      if (!fechaFinISO) {
        setError("La fecha de plazo es inválida.");
        setSaving(false);
        return;
      }

      if (new Date(fechaFinISO) < new Date(fechaISO)) {
         setError("El plazo de reserva no puede ser anterior a la fecha de inicio.");
         setSaving(false);
         return;
      }

      // Normalizar IDs numéricos
      const loteIdNum = Number(loteId);
      const clienteIdNum = Number(clienteId);

      const payload = {
        fechaReserva: fechaISO,
        loteId: loteIdNum,
        clienteId: clienteIdNum,
       // Para INMOBILIARIA: no enviar inmobiliariaId (el backend usará user.inmobiliariaId)

        // Para ADMIN/GESTOR: enviar inmobiliariaId si fue seleccionada

        ...(isInmobiliaria ? {} : {

          inmobiliariaId: inmobiliariaId && inmobiliariaId.trim() ? Number(inmobiliariaId) : null,

        }),
        sena: senaNum,
        numero: numeroTrim,
        fechaFinReserva: fechaFinISO,
      };

      // Debug: mostrar payload para detectar discrepancias
      // (Quitar console.log en producción)
      console.debug("➡️ createReserva payload:", payload);

      const response = await createReserva(payload);

      console.debug("⬅️ createReserva response:", response);

      // Manejar respuesta del backend de forma más informativa
      if (!response || !response.success) {

        throw new Error(response?.message || "Error al crear la reserva");

      }

      // Éxito
      setShowSuccess(true);
      onCreated?.(response.data);

      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (err) {
      console.error("Error creando reserva:", err);

      let errorMessage = err?.message || "No se pudo crear la reserva. Intenta nuevamente.";

      // Manejar errores específicos (unicidad numero)
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const mensajes = err.response.data.errors.map((e) => {
          if (typeof e === 'string') return e;
          const campo = e.path?.[0] || '';
          const msg = e.message || '';
          if (campo === 'numero') {
            if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('exist')) {
              setNumeroError("Ya existe una reserva con este número");
              return "Número de reserva ya existente";
            }
            setNumeroError("Número de reserva inválido");
          }
          return msg || 'Error de validación';
        });
        errorMessage = mensajes.join(", ");
      } else if (typeof errorMessage === "string" && /numero/i.test(errorMessage)) {
        setNumeroError("Ya existe una reserva con este número");
      } else if (err?.response?.data?.message) {
        if (String(err.response.data.message).toLowerCase().includes('número') || String(err.response.data.message).toLowerCase().includes('numero')) {
          setNumeroError("Ya existe una reserva con este número");
        }
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
      setSaving(false);
    }
  }

  // Renderizar animación incluso si el modal se está cerrando
  const shouldRender = open || showSuccess;
  if (!shouldRender) return null;

  return (
    <>
      {/* Animación de éxito */}
      <SuccessAnimation show={showSuccess} message={`¡${entityType} creada exitosamente!`} />

      <EditarBase
        open={open}
        title="Registrar Reserva"
        onCancel={() => {
          if (showSuccess) return;
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        onSave={handleSave}
        saving={saving}
        saveButtonText="Confirmar Reserva"
        headerRight={
          (loadingLotes || loadingPersonas || (!isInmobiliaria && loadingInmobiliarias)) ? (
            <span className="badge bg-warning text-dark">Cargando...</span>
          ) : null
        }
      >
        <div>
          <h3 className="venta-section-title" style={{ paddingBottom: "6px", marginBottom: "18px" }}>
            Información de la Reserva
          </h3>
          <div
            className="venta-grid"
            style={{ ["--sale-label-w"]: `${computedLabelWidth}px` }}
          >
            {/* Columna izquierda */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">LOTE</div>
                {(fromSidePanel || lockLote) && loteSeleccionadoMapId ? (
                  // Cuando viene del side panel o desde fila, mostrar el lote como read-only
                  <div className="field-value is-readonly">
                    {loteSeleccionadoMapId}
                  </div>
                ) : (fromSidePanel || lockLote) ? (
                  // Si aún no se cargó el mapId, mostrar placeholder (evitar parpadeo)
                  <div className="field-value is-readonly">—</div>
                ) : (
                  <div className="field-value p0" style={{ alignItems: "flex-start" }}>
                    <div style={{ width: "100%", position: "relative" }}>
                      <div style={{ position: "relative" }}>
                        <input
                          className="field-input"
                          placeholder={loteId ? "" : "Buscar lote por número o calle"}
                          value={loteId && !busquedaLote ? (() => {
                            const loteSeleccionado = lotes.find(l => String(l.id) === String(loteId));
                            if (!loteSeleccionado) return "";
                            const mapId = loteSeleccionado.mapId;
                            return String(mapId).toLowerCase().startsWith('lote') ? mapId : `Lote ${mapId}`;
                          })() : busquedaLote}
                          onChange={(e) => {
                            setBusquedaLote(e.target.value);
                            // Si empieza a escribir, limpiar la selección para permitir buscar otro lote
                            if (e.target.value && loteId) {
                              setLoteId("");
                            }
                          }}
                          onFocus={() => {
                            // Al hacer focus, activar el modo búsqueda
                            if (loteId) {
                              setBusquedaLote("");
                              setLoteId("");
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
                            const mapId = l.mapId || l.numero || l.id;
                            const displayText = String(mapId).toLowerCase().startsWith('lote') 
                              ? mapId 
                              : `Lote ${mapId}`;
                            return (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => { setLoteId(String(l.id)); setBusquedaLote(""); }}
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
                )}
              </div>

              <div className="field-row">
                <div className="field-label">FECHA</div>
                <div className="field-value p0">
                  <input
                    className="field-input"
                    type="date"
                    value={fechaReserva}
                    onChange={(e) => setFechaReserva(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">COMPRADOR</div>
                <div className="field-value p0" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <NiceSelect
                      value={clienteId || ""}
                      options={personaOpts}
                      placeholder="Seleccionar cliente"
                      onChange={(val) => setClienteId(val || "")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenCrearPersona(true);
                    }}
                    style={{
                      padding: "8px 12px",
                      background: "white",
                      color: "#111",
                      border: "1px solid rgba(0,0,0,.3)",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "16px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      marginLeft: "8px",
                      flexShrink: 0,
                      height: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    title="Crear nuevo cliente"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">INMOBILIARIA</div>
                {isInmobiliaria ? (
                  <div className="field-value is-readonly">
                    {user?.inmobiliariaNombre || ""}
                  </div>
                ) : (
                  <div className="field-value p0">
                    <NiceSelect
                      value={inmobiliariaId}
                      options={inmobiliarias}
                      placeholder="Seleccionar inmobiliaria (opcional)"
                      onChange={(val) => setInmobiliariaId(val)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">NÚMERO DE RESERVA</div>
                <div className="field-value p0">
                  <input
                    className="field-input"
                    type="text"
                    value={numero}
                    onChange={(e) => {
                      setNumero(e.target.value);
                      if (numeroError) setNumeroError(null);
                    }}
                    placeholder="Ej: RES-2025-01"
                  />
                  {numeroError && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "#b91c1c" }}>
                      {numeroError}
                    </div>
                  )}
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">PLAZO RESERVA</div>
                <div className="field-value p0">
                  <input
                    className="field-input"
                    type="date"
                    value={plazoReserva}
                    onChange={(e) => setPlazoReserva(e.target.value)}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">MONTO RESERVA/SEÑA</div>
                <div className="field-value p0" style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                  <input
                    className="field-input"
                    type="number"
                    inputMode="numeric"
                    step="100"
                    min="0"
                    value={sena}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || Number(value) >= 0) {
                        setSena(value);
                      }
                    }}
                    placeholder="0"
                    style={{ flex: 1, paddingRight: "50px" }}
                  />
                  <span style={{ position: "absolute", right: "12px", color: "#6B7280", fontSize: "13.5px", fontWeight: 500 }}>
                    USD
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <PersonaCrearCard
          open={openCrearPersona}
          onCancel={() => setOpenCrearPersona(false)}
          onCreated={handlePersonaCreated}
        />
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
