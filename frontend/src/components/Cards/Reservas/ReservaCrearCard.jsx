// src/components/Cards/Reservas/ReservaCrearCard.jsx
import { useEffect, useRef, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { createReserva } from "../../../lib/api/reservas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import { getAllLotes } from "../../../lib/api/lotes.js";
import PersonaCrearCard from "../Personas/PersonaCrearCard.jsx";

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
}) {
  // Estados de formulario
  const [fechaReserva, setFechaReserva] = useState(toDateInputValue(new Date()));
  const [loteId, setLoteId] = useState(loteIdPreSeleccionado ? String(loteIdPreSeleccionado) : "");
  const [clienteId, setClienteId] = useState("");
  const [inmobiliariaId, setInmobiliariaId] = useState("");
  const [plazoReserva, setPlazoReserva] = useState(toDateInputValue(new Date()));
  const [sena, setSena] = useState("");
  
  // Estados de datos
  const [lotes, setLotes] = useState([]);
  const [personas, setPersonas] = useState([]);
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

  // Cargar datos al abrir
  useEffect(() => {
    if (!open) return;
    
    // Cargar lotes disponibles (solo DISPONIBLE)
    setLoadingLotes(true);
    (async () => {
      try {
        const resp = await getAllLotes({});
        const lotesData = resp?.data || [];
        // Normalizar lotes para el select - solo DISPONIBLE
        // Asegurar que solo se incluyan lotes con estado DISPONIBLE (no RESERVADO, VENDIDO, ALQUILADO, etc.)
        const lotesNormalizados = lotesData
          .filter(l => {
            const estado = String(l.estado || l.status || "").trim().toUpperCase();
            // Solo permitir lotes DISPONIBLES
            return estado === "DISPONIBLE";
          })
          .map(l => {
            const ubicacion = l.ubicacion || {};
            const ubicacionStr = ubicacion.calle && ubicacion.numero 
              ? ` - ${ubicacion.calle} ${ubicacion.numero}` 
              : ubicacion.calle 
                ? ` - ${ubicacion.calle}` 
                : "";
            return {
              value: String(l.id),
              label: `Lote ${l.id}${ubicacionStr}`.trim(),
              lote: l
            };
          });
        setLotes(lotesNormalizados);
      } catch (err) {
        console.error("Error cargando lotes:", err);
        setLotes([]);
      } finally {
        setLoadingLotes(false);
      }
    })();

    // Cargar personas
    setLoadingPersonas(true);
    (async () => {
      try {
        const resp = await getAllPersonas({});
        const personasData = resp?.personas || [];
        const personasNormalizadas = personasData.map(p => ({
          value: String(p.id),
          label: `${p.nombreCompleto || `${p.nombre || ""} ${p.apellido || ""}`.trim() || `ID: ${p.id}`}`,
          persona: p
        }));
        setPersonas(personasNormalizadas);
      } catch (err) {
        console.error("Error cargando personas:", err);
        setPersonas([]);
      } finally {
        setLoadingPersonas(false);
      }
    })();

    // Resetear búsqueda de lote al abrir
    setBusquedaLote("");

    // Cargar inmobiliarias
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
  }, [open]);

  // Resetear cuando se cierra
  useEffect(() => {
    if (!open) {
      setFechaReserva(toDateInputValue(new Date()));
      setLoteId(loteIdPreSeleccionado ? String(loteIdPreSeleccionado) : "");
      setClienteId("");
      setInmobiliariaId("");
      setPlazoReserva(toDateInputValue(new Date()));
      setSena("");
      setError(null);
      setShowSuccess(false);
      setSaving(false);
      setBusquedaLote("");
    }
  }, [open, loteIdPreSeleccionado]);

  // Filtrar lotes según búsqueda - solo cuando hay texto
  const lotesFiltrados = busquedaLote.trim()
    ? lotes.filter(l => {
        const idLote = String(l.value);
        const labelLote = l.label.toLowerCase();
        const busqueda = busquedaLote.toLowerCase().trim();
        return idLote.includes(busqueda) || labelLote.includes(busqueda);
      })
    : [];

  // Handler para cuando se crea una nueva persona
  const handlePersonaCreated = (nuevaPersona) => {
    // Agregar la nueva persona a la lista
    const nuevaOpcion = {
      value: String(nuevaPersona.id),
      label: `${nuevaPersona.nombreCompleto || `${nuevaPersona.nombre || ""} ${nuevaPersona.apellido || ""}`.trim() || `ID: ${nuevaPersona.id}`}`,
      persona: nuevaPersona
    };
    setPersonas(prev => [nuevaOpcion, ...prev]);
    // Seleccionar automáticamente la nueva persona
    setClienteId(String(nuevaPersona.id));
    setOpenCrearPersona(false);
  };

  // Calcular ancho de labels
  const LABELS = ["Nº RESERVA", "LOTE ASOCIADO", "FECHA RESERVA", "COMPRADOR", "INMOBILIARIA", "ESTADO RESERVA", "PLAZO RESERVA", "MONTO RESERVA/SEÑA"];
  const computedLabelWidth = Math.min(260, Math.max(160, Math.round(Math.max(...LABELS.map(l => l.length)) * 8.2) + 22));

  async function handleSave() {
    setError(null);
    setSaving(true);

    // Validaciones
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

      const payload = {
        fechaReserva: fechaISO,
        loteId: Number(loteId),
        clienteId: Number(clienteId),
        inmobiliariaId: inmobiliariaId && inmobiliariaId.trim() ? Number(inmobiliariaId) : null,
        sena: senaNum,
      };

      const response = await createReserva(payload);

      if (!response || !response.success) {
        throw new Error(response?.message || "Error al crear la reserva");
      }

      // Mostrar animación de éxito
      setShowSuccess(true);
      onCreated?.(response.data);
      
      // Esperar un momento y luego cerrar
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (err) {
      console.error("Error creando reserva:", err);
      setError(err?.message || "No se pudo crear la reserva. Intenta nuevamente.");
      setSaving(false);
    }
  }

  // Renderizar animación incluso si el modal se está cerrando
  const shouldRender = open || showSuccess;
  if (!shouldRender) return null;

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
              ¡{entityType} creada exitosamente!
            </h3>
          </div>
        </div>
      )}

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
          (loadingLotes || loadingPersonas || loadingInmobiliarias) ? (
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
                <div className="field-label">Nº RESERVA</div>
                <div className="field-value is-readonly">
                  Automático
                </div>
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
                      value={clienteId}
                      options={personas}
                      placeholder="Seleccionar cliente"
                      onChange={(val) => setClienteId(val)}
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
                <div className="field-value p0">
                  <NiceSelect
                    value={inmobiliariaId}
                    options={inmobiliarias}
                    placeholder="Seleccionar inmobiliaria (opcional)"
                    onChange={(val) => setInmobiliariaId(val)}
                  />
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

            {/* Columna derecha */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">ESTADO RESERVA</div>
                <div className="field-value is-readonly">
                  ACTIVA
                </div>
              </div>

              <div className="field-row" style={{ alignItems: "flex-start" }}>
                <div className="field-label" style={{ alignSelf: "flex-start", paddingTop: "11.5px" }}>LOTE ASOCIADO</div>
                <div className="field-value p0" style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "stretch", alignSelf: "stretch" }}>
                  <div style={{ position: "relative", width: "100%" }}>
                    {loteIdPreSeleccionado ? (
                      <div style={{
                        padding: "10px 12px",
                        background: "#e0f2fe",
                        border: "1px solid #60a5fa",
                      }}>
                        {lotes.find(l => l.value === String(loteIdPreSeleccionado))?.label || `Lote ${loteIdPreSeleccionado}`}
                      </div>
                    ) : (
                      <><input
                          type="text"
                          placeholder={loteId ? lotes.find(l => l.value === loteId)?.label || loteId : "Buscar lote por número..."}
                          value={busquedaLote}
                          onChange={(e) => {
                            const valor = e.target.value;
                            setBusquedaLote(valor);
                            // Si se borra todo, limpiar también la selección
                            if (!valor.trim()) {
                              setLoteId("");
                            }
                          } }
                          onFocus={() => {
                            // Si hay un lote seleccionado, mostrar su info en la búsqueda
                            if (loteId && !busquedaLote.trim()) {
                              const loteSeleccionado = lotes.find(l => l.value === loteId);
                              if (loteSeleccionado) {
                                setBusquedaLote(loteSeleccionado.label);
                              }
                            }
                          } }
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            paddingLeft: "40px",
                            border: "1px solid rgba(0,0,0,.18)",
                            borderRadius: "6px",
                            fontSize: "13.5px",
                            boxShadow: "0 2px 4px rgba(0,0,0,.10)"
                          }} /><svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              position: "absolute",
                              left: "12px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "#6B7280",
                              pointerEvents: "none"
                            }}
                          >
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                          </svg></>
                      
                    )}
                  </div>

                  {/* Solo mostrar búsqueda / resultados / confirmación si NO viene preseleccionado */}
                  {!loteIdPreSeleccionado && busquedaLote.trim() && lotesFiltrados.length > 0 && (
                    <div style={{ 
                      maxHeight: "200px", 
                      overflowY: "auto", 
                      border: "1px solid rgba(0,0,0,.18)", 
                      borderRadius: "6px",
                      backgroundColor: "white",
                      boxShadow: "0 2px 4px rgba(0,0,0,.10)",
                      marginTop: "4px"
                    }}>
                      {lotesFiltrados.map((lote) => (
                        <div
                          key={lote.value}
                          onClick={() => {
                            setLoteId(lote.value);
                            setBusquedaLote("");
                          }}
                          style={{
                            padding: "10px 12px",
                            cursor: "pointer",
                            borderBottom: "1px solid rgba(0,0,0,.08)",
                            backgroundColor: loteId === lote.value ? "#eaf3ed" : "white",
                          }}
                          onMouseEnter={(e) => {
                            if (loteId !== lote.value) {
                              e.target.style.backgroundColor = "#f3f4f6";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (loteId !== lote.value) {
                              e.target.style.backgroundColor = "white";
                            }
                          }}
                        >
                          {lote.label}
                        </div>
                      ))}
                    </div>
                  )}

                  {!loteIdPreSeleccionado && busquedaLote.trim() && lotesFiltrados.length === 0 && (
                    <div style={{
                      padding: "12px",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "#991b1b",
                      textAlign: "center"
                    }}>
                      No se encontraron lotes
                    </div>
                  )}

                  {!loteIdPreSeleccionado && loteId && !busquedaLote.trim() && (
                    <div style={{
                      padding: "10px 12px",
                      background: "#eaf3ed",
                      border: "1px solid #10b981",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "#065f46",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>{lotes.find(l => l.value === loteId)?.label || loteId}</span>
                    </div>
                  )}
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
