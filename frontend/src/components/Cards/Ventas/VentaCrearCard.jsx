import { useEffect, useMemo, useRef, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import { getAllLotes } from "../../../lib/api/lotes.js";
import { createVenta } from "../../../lib/api/ventas.js";

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

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [pRes, iRes, lRes] = await Promise.all([
          getAllPersonas({}),
          getAllInmobiliarias({}),
          getAllLotes({}),
        ]);
        const pData = pRes?.data ?? (Array.isArray(pRes) ? pRes : []);
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
    if (!open) return;
    if (loteIdPreSeleccionado) setLoteId(String(loteIdPreSeleccionado));
  }, [open, loteIdPreSeleccionado]);

  const personaOpts = useMemo(
    () => personas.map((p) => ({ value: p.id ?? p.idPersona ?? "", label: `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || `Persona ${p.id}` })),
    [personas]
  );
  const inmoOpts = useMemo(
    () => inmobiliarias.map((i) => ({ value: i.id ?? i.idInmobiliaria ?? "", label: i.nombre ?? i.razonSocial ?? "Inmobiliaria" })),
    [inmobiliarias]
  );
  
  // Lotes para buscador: utilizo número/id visible
  const lotesFiltrados = useMemo(() => {
    const q = busquedaLote.trim().toLowerCase();
    if (!q) return [];
    return lotes.filter((l) =>
      String(l.id || l.loteId || "").toLowerCase().includes(q) ||
      String(l.location || l.ubicacion?.calle || "").toLowerCase().includes(q)
    );
  }, [busquedaLote, lotes]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (!loteId || !compradorId || !monto) {
        throw new Error("Completa lote, comprador y monto");
      }
      const body = {
        loteId: Number(loteId),
        compradorId: Number(compradorId),
        inmobiliariaId: inmobiliariaId ? Number(inmobiliariaId) : null,
        fechaVenta: fromDateInputToISO(fechaVenta) || new Date().toISOString(),
        monto: Number(monto),
        tipoPago: tipoPago || null,
        plazoEscritura: plazoEscritura ? fromDateInputToISO(plazoEscritura) : null,
      };
      const resp = await createVenta(body);
      const created = resp?.data ?? resp ?? null;
      setShowSuccess(true);
      onCreated?.(created);
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (e) {
      console.error("Error creando venta:", e);
      setError(e?.message || "No se pudo registrar la venta");
      setSaving(false);
    }
  }

  if (!open && !showSuccess) return null;

  return (
    <>
      {showSuccess && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", zIndex: 10000 }}>
          <div style={{ background: "#fff", padding: 32, borderRadius: 12 }}>¡Venta registrada!</div>
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
                  <div style={{ width: "100%" }}>
                    <div style={{ position: "relative" }}>
                      <input
                        className="field-input"
                        placeholder="Buscar lote por número o calle"
                        value={busquedaLote}
                        onChange={(e) => setBusquedaLote(e.target.value)}
                      />
                      <svg width="18" height="18" viewBox="0 0 24 24" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", opacity: .6 }}>
                        <circle cx="11" cy="11" r="7" stroke="#666" strokeWidth="2" fill="none"/>
                        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#666" strokeWidth="2"/>
                      </svg>
                    </div>
                    {busquedaLote && (
                      <div style={{ marginTop: 8, maxHeight: 180, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                        {lotesFiltrados.length === 0 && (
                          <div style={{ padding: 10, color: "#6b7280" }}>No se encontraron lotes</div>
                        )}
                        {lotesFiltrados.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => { setLoteId(String(l.id)); setBusquedaLote(""); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "#fff", border: "none", cursor: "pointer" }}
                          >
                            {`Lote N° ${l.id}`} <span style={{ color: "#6b7280" }}>({String(l.estado || l.status)})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {loteId && (
                      <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>Seleccionado: Lote N° {loteId}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">COMPRADOR</div>
                <div className="field-value p0">
                  <NiceSelect value={compradorId} options={personaOpts} onChange={setCompradorId} />
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
    </>
  );
}


