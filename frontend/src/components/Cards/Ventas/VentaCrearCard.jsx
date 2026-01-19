import { useEffect, useMemo, useRef, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import NiceSelect from "../../Base/NiceSelect.jsx";
import "../Base/cards.css";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import { getAllLotes } from "../../../lib/api/lotes.js";
import { createVenta } from "../../../lib/api/ventas.js";
import PersonaCrearCard from "../Personas/PersonaCrearCard.jsx";

function toDateInputValue(v) {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function fromDateInputToISO(s) {
  if (!s || !s.trim()) return null;
  const date = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function VentaCrearCard({
  open,
  onCancel,
  onCreated,
  loteIdPreSeleccionado,
  lockLote = false, // Si viene desde fila del tablero, bloquear el campo lote
}) {
  const [fechaVenta, setFechaVenta] = useState(toDateInputValue(new Date()));
  const [loteId, setLoteId] = useState(loteIdPreSeleccionado ? String(loteIdPreSeleccionado) : "");
  const [compradorId, setCompradorId] = useState("");
  const [inmobiliariaId, setInmobiliariaId] = useState("");
  const [numero, setNumero] = useState("");
  const [monto, setMonto] = useState("");
  const [tipoPago, setTipoPago] = useState("");
  const [plazoEscritura, setPlazoEscritura] = useState("");

  const [personas, setPersonas] = useState([]);
  const [inmobiliarias, setInmobiliarias] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [busquedaLote, setBusquedaLote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [numeroError, setNumeroError] = useState(null);
  const [openCrearPersona, setOpenCrearPersona] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [pRes, iRes, lRes] = await Promise.all([
          getAllPersonas({}),
          getAllInmobiliarias({}),
          getAllLotes({}),
        ]);
        const pData = pRes?.personas ?? pRes?.data ?? (Array.isArray(pRes) ? pRes : []);
        const iData = iRes?.data ?? (Array.isArray(iRes) ? iRes : []);
        const lData = lRes?.data ?? (Array.isArray(lRes) ? lRes : []);
        setPersonas(Array.isArray(pData) ? pData : []);
        setInmobiliarias(Array.isArray(iData) ? iData : []);
        let filteredLots = Array.isArray(lData)
          ? lData.filter((l) => {
              const st = String(l.estado || l.status || "").toUpperCase();
              return st === "DISPONIBLE" || st === "RESERVADO";
            })
          : [];
        
        if (lockLote && loteIdPreSeleccionado) {
          const lotePrecargado = lData.find(l => String(l.id) === String(loteIdPreSeleccionado));
          if (lotePrecargado && !filteredLots.find(l => String(l.id) === String(lotePrecargado.id))) {
            filteredLots = [lotePrecargado, ...filteredLots];
          }
        }
        setLotes(filteredLots);
      } catch (e) {
        console.error("Error cargando lookups venta:", e);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Limpiar todos los datos cuando se cierra el modal sin guardar
      setBusquedaLote("");
      setCompradorId("");
      setInmobiliariaId("");
      setNumero("");
      setMonto("");
      setTipoPago("");
      setPlazoEscritura("");
      setFechaVenta(toDateInputValue(new Date()));
      setError(null);
      setNumeroError(null);
      setOpenCrearPersona(false);
      // Solo resetear loteId si no viene precargado
      if (!loteIdPreSeleccionado) {
        setLoteId("");
      }
      return;
    }
    if (loteIdPreSeleccionado) {
      setLoteId(String(loteIdPreSeleccionado));
    }
  }, [open, loteIdPreSeleccionado]);

  // Handler para cuando se crea una nueva persona
  const handlePersonaCreated = (nuevaPersona) => {
    // Agregar la nueva persona a la lista
    setPersonas(prev => [nuevaPersona, ...prev]);
    // Seleccionar automáticamente la nueva persona
    setCompradorId(String(nuevaPersona.id));
    setOpenCrearPersona(false);
  };

  const personaOpts = useMemo(
    () => personas.map((p) => ({
      value: String(p.id ?? p.idPersona ?? ""),
      label: `${p.nombreCompleto || `${p.nombre || ""} ${p.apellido || ""}`.trim() || `ID: ${p.id}`}`,
      persona: p
    })),
    [personas]
  );
  const inmoOpts = useMemo(
    () => inmobiliarias.map((i) => ({ value: i.id ?? i.idInmobiliaria ?? "", label: i.nombre ?? i.razonSocial ?? "Inmobiliaria" })),
    [inmobiliarias]
  );
  
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

  // Calcular el mapId del lote seleccionado cuando viene bloqueado
  const loteSeleccionadoMapId = useMemo(() => {
    if (!lockLote || !loteId) return null;
    const loteSeleccionado = lotes.find(l => String(l.id) === String(loteId));
    if (!loteSeleccionado) return null;
    const mapId = loteSeleccionado.mapId;
    if (!mapId) return null;
    return String(mapId).toLowerCase().startsWith('lote') ? mapId : `Lote ${mapId}`;
  }, [lockLote, loteId, lotes]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNumeroError(null);
    try {
      const errores = [];

      const numeroTrim = String(numero || "").trim();
      if (!numeroTrim || numeroTrim.length < 3 || numeroTrim.length > 30) {
        setNumeroError("Número de venta obligatorio (3 a 30 caracteres)");
        errores.push("Número de venta");
      }
      
      if (!loteId || String(loteId).trim() === "") {
        errores.push("Lote");
      }
      
      if (!compradorId || String(compradorId).trim() === "") {
        errores.push("Comprador");
      }
      
      const montoNum = Number(monto);
      if (!monto || String(monto).trim() === "" || isNaN(montoNum) || montoNum <= 0) {
        errores.push("Monto (debe ser un número mayor a 0)");
      }
      
      if (!tipoPago || String(tipoPago).trim() === "") {
        errores.push("Tipo de pago");
      }
      
      if (errores.length > 0) {
        throw new Error(`Faltan los siguientes campos: ${errores.join(", ")}`);
      }
      
      const body = {
        loteId: Number(loteId),
        compradorId: Number(compradorId),
        fechaVenta: fromDateInputToISO(fechaVenta) || new Date().toISOString(),
        monto: montoNum,
        estado: 'INICIADA',
        numero: numeroTrim,
        tipoPago: String(tipoPago).trim(),
      };
      
      if (inmobiliariaId && String(inmobiliariaId).trim() !== "") {
        body.inmobiliariaId = Number(inmobiliariaId);
      }
      
      if (plazoEscritura && String(plazoEscritura).trim() !== "") {
        body.plazoEscritura = fromDateInputToISO(plazoEscritura);
      }
      
      const resp = await createVenta(body);
      const created = resp?.data ?? resp ?? null;
      
      if (created && body.loteId) {
        try {
          await updateLote(body.loteId, { estado: "Vendido" });
        } catch (err) {
          console.error("Error actualizando estado del lote:", err);
        }
      }
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCreated?.(created);
        onCancel?.();
      }, 1500);
    } catch (e) {
      console.error("Error creando venta:", e);
      let errorMessage = "No se pudo registrar la venta";
      
      if (e?.message) {
        errorMessage = e.message;
      } else if (e?.response?.data?.message) {
        errorMessage = e.response.data.message;
      } else if (e?.response?.data?.errors && Array.isArray(e.response.data.errors)) {
        const mensajes = e.response.data.errors.map((err) => {
          if (typeof err === 'string') return err;
          const campo = err.path?.[0] || '';
          const msg = err.message || '';
          if (campo === 'numero') {
            if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('exist')) {
              setNumeroError("Ya existe una venta con este número");
              return "Número de venta ya existente";
            }
            setNumeroError("Número de venta inválido");
          }
          if (msg.includes('expected string, received null')) {
            return `${campo || 'Campo'}: no puede estar vacío`;
          }
          if (msg.includes('expected number')) {
            return `${campo || 'Campo'}: debe ser un número válido`;
          }
          return msg || 'Error de validación';
        });
        errorMessage = mensajes.join(", ");
      } else if (typeof errorMessage === "string" && /numero/i.test(errorMessage)) {
        // Fallback genérico para errores de unicidad provenientes del backend
        setNumeroError("Ya existe una venta con este número");
      }
      
      setError(errorMessage);
      setSaving(false);
    }
  }

  if (!open && !showSuccess) return null;

  return (
    <>
      <SuccessAnimation show={showSuccess} message="¡Venta registrada exitosamente!" />

      {open && (
        <EditarBase
          open={open}
          title="Registrar Venta"
          onCancel={() => { if (showSuccess) return; onCancel?.(); }}
          onSave={handleSave}
          saving={saving}
          saveButtonText="Confirmar Venta"
        >
          <div className="venta-grid" style={{ ["--sale-label-w"]: "180px" }}>
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">LOTE</div>
                {lockLote && loteSeleccionadoMapId ? (
                  // Cuando viene desde fila, mostrar el lote como read-only
                  <div className="field-value is-readonly">
                    {loteSeleccionadoMapId}
                  </div>
                ) : lockLote ? (
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
                          if (e.target.value && loteId) {
                            setLoteId("");
                          }
                        }}
                        onFocus={() => {
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
                <div className="field-label">COMPRADOR</div>
                <div className="field-value p0" style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <NiceSelect value={compradorId} options={personaOpts} onChange={setCompradorId} placeholder="Seleccionar comprador" />
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
                    title="Crear nuevo comprador"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">INMOBILIARIA</div>
                <div className="field-value p0">
                  <NiceSelect value={inmobiliariaId} options={inmoOpts} onChange={setInmobiliariaId} placeholder="(Opcional)" />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">TIPO PAGO</div>
                <div className="field-value p0">
                  <input className="field-input" value={tipoPago} onChange={(e) => setTipoPago(e.target.value)} placeholder="Ej: Contado, Transferencia, Mixto" />
                </div>
              </div>
            </div>

            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">NÚMERO DE VENTA</div>
                <div className="field-value p0">
                  <input
                    className="field-input"
                    value={numero}
                    onChange={(e) => {
                      setNumero(e.target.value);
                      if (numeroError) setNumeroError(null);
                    }}
                    placeholder="Ej: CCLF-2025-01"
                  />
                  {numeroError && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "#b91c1c" }}>
                      {numeroError}
                    </div>
                  )}
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">FECHA</div>
                <div className="field-value p0">
                  <input className="field-input" type="date" value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">MONTO</div>
                <div className="field-value p0" style={{ position: "relative" }}>
                  <input className="field-input" type="number" min="0" step="100" value={monto} onChange={(e) => setMonto(e.target.value)} style={{ paddingRight: 50 }} />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280" }}>USD</span>
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">PLAZO ESCRITURA</div>
                <div className="field-value p0">
                  <input className="field-input" type="date" value={plazoEscritura} onChange={(e) => setPlazoEscritura(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: 10, background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>{error}</div>
          )}
        </EditarBase>
      )}

      <PersonaCrearCard
        open={openCrearPersona}
        onCancel={() => setOpenCrearPersona(false)}
        onCreated={handlePersonaCreated}
      />
    </>
  );
}


