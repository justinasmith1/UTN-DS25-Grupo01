import { useEffect, useMemo, useRef, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import "../Base/cards.css";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import { getAllLotes, updateLote } from "../../../lib/api/lotes.js";
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

function NiceSelect({ value, options, placeholder = "Seleccionar", onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (!btnRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const label = options.find((o) => `${o.value}` === `${value}`)?.label ?? placeholder;
  return (
    <div className="ns-wrap" style={{ position: "relative" }}>
      <button type="button" ref={btnRef} className="ns-trigger" onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
          <polyline points="5,7 10,12 15,7" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul ref={listRef} className="ns-list" role="listbox" tabIndex={-1} style={{ zIndex: 10000 }}>
          {options.map((opt) => (
            <li
              key={`${opt.value}::${opt.label}`}
              role="option"
              aria-selected={`${opt.value}` === `${value}`}
              className={`ns-item ${`${opt.value}` === `${value}` ? "is-active" : ""}`}
              onClick={() => {
                onChange?.(opt.value);
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

export default function VentaCrearCard({
  open,
  onCancel,
  onCreated,
  loteIdPreSeleccionado,
}) {
  const [fechaVenta, setFechaVenta] = useState(toDateInputValue(new Date()));
  const [loteId, setLoteId] = useState(loteIdPreSeleccionado ? String(loteIdPreSeleccionado) : "");
  const [compradorId, setCompradorId] = useState("");
  const [inmobiliariaId, setInmobiliariaId] = useState("");
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
        // Solo lotes DISPONIBLE o RESERVADO
        const filteredLots = Array.isArray(lData)
          ? lData.filter((l) => {
              const st = String(l.estado || l.status || "").toUpperCase();
              return st === "DISPONIBLE" || st === "RESERVADO";
            })
          : [];
        setLotes(filteredLots);
      } catch (e) {
        console.error("Error cargando lookups venta:", e);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Limpiar todos los datos cuando se cierra el modal sin guardar
      setLoteId("");
      setBusquedaLote("");
      setCompradorId("");
      setInmobiliariaId("");
      setMonto("");
      setTipoPago("");
      setPlazoEscritura("");
      setFechaVenta(toDateInputValue(new Date()));
      setError(null);
      setOpenCrearPersona(false);
      return;
    }
    if (loteIdPreSeleccionado) setLoteId(String(loteIdPreSeleccionado));
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
  
  // Lotes para buscador: filtrar por mapId, numero o texto visible
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

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const errores = [];
      
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
          if (msg.includes('expected string, received null')) {
            return `${campo || 'Campo'}: no puede estar vacío`;
          }
          if (msg.includes('expected number')) {
            return `${campo || 'Campo'}: debe ser un número válido`;
          }
          return msg || 'Error de validación';
        });
        errorMessage = mensajes.join(", ");
      }
      
      setError(errorMessage);
      setSaving(false);
    }
  }

  if (!open && !showSuccess) return null;

  return (
    <>
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
              ¡Venta registrada exitosamente!
            </h3>
          </div>
        </div>
      )}

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


