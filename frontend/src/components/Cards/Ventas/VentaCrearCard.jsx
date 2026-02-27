import { useEffect, useMemo, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import SuccessAnimation from "../Base/SuccessAnimation.jsx";
import NiceSelect from "../../Base/NiceSelect.jsx";
import "../Base/cards.css";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";
import { getAllPersonas } from "../../../lib/api/personas.js";
import { getAllLotes } from "../../../lib/api/lotes.js";
import { createVenta } from "../../../lib/api/ventas.js";
import CompradoresMultiSelect from "./CompradoresMultiSelect.jsx";
import { toDateInputValue, fromDateInputToISO } from "../../../utils/ventaDateUtils";
import { mapVentaBackendError } from "../../../utils/ventaErrorMapper";

const INITIAL_ERRORS = {
  numero: null,
  loteId: null,
  monto: null,
  tipoPago: null,
  compradores: null,
  general: null,
};

export default function VentaCrearCard({
  open,
  onCancel,
  onCreated,
  loteIdPreSeleccionado,
  lockLote = false,
}) {
  const [fechaVenta, setFechaVenta] = useState(toDateInputValue(new Date()));
  const [loteId, setLoteId] = useState(loteIdPreSeleccionado ? String(loteIdPreSeleccionado) : "");
  // Etapa 4: compradores múltiples
  const [compradores, setCompradores] = useState([]);
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
  const [errors, setErrors] = useState(INITIAL_ERRORS);

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
      setBusquedaLote("");
      setCompradores([]);
      setInmobiliariaId("");
      setNumero("");
      setMonto("");
      setTipoPago("");
      setPlazoEscritura("");
      setFechaVenta(toDateInputValue(new Date()));
      setErrors({ ...INITIAL_ERRORS });
      if (!loteIdPreSeleccionado) setLoteId("");
      return;
    }
    if (loteIdPreSeleccionado) setLoteId(String(loteIdPreSeleccionado));
  }, [open, loteIdPreSeleccionado]);

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

  const loteSeleccionadoMapId = useMemo(() => {
    if (!lockLote || !loteId) return null;
    const loteSeleccionado = lotes.find(l => String(l.id) === String(loteId));
    if (!loteSeleccionado) return null;
    const mapId = loteSeleccionado.mapId;
    if (!mapId) return null;
    return String(mapId).toLowerCase().startsWith('lote') ? mapId : `Lote ${mapId}`;
  }, [lockLote, loteId, lotes]);

  function clearFieldError(field) {
    setErrors(prev => ({ ...prev, [field]: null }));
  }

  function clearAllErrors() {
    setErrors({ ...INITIAL_ERRORS });
  }

  function handleBackendError(e) {
    const { fieldErrors, generalMessage } = mapVentaBackendError(e, {
      defaultMessage: "No se pudo registrar la venta",
    });

    setErrors(prev => ({
      ...prev,
      ...fieldErrors,
      general: generalMessage ?? prev.general,
    }));
  }

  async function handleSave() {
    setSaving(true);
    clearAllErrors();

    const newErrors = {};
    const numeroTrim = String(numero || "").trim();
    const montoNum = Number(monto);

    if (!numeroTrim || numeroTrim.length < 3 || numeroTrim.length > 30) {
      newErrors.numero = "Número de venta obligatorio (3 a 30 caracteres)";
    }

    if (compradores.length === 0) {
      newErrors.compradores = "Debe seleccionar al menos un comprador";
    }

    if (!loteId || String(loteId).trim() === "") {
      newErrors.loteId = "Debe seleccionar un lote";
    }

    if (!monto || String(monto).trim() === "" || isNaN(montoNum) || montoNum <= 0) {
      newErrors.monto = "El monto debe ser un número mayor a 0";
    }

    if (!tipoPago || String(tipoPago).trim() === "") {
      newErrors.tipoPago = "El tipo de pago es obligatorio";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors({ ...INITIAL_ERRORS, ...newErrors });
      setSaving(false);
      return;
    }

    try {
      const body = {
        loteId: Number(loteId),
        compradores: compradores.map(c => ({ personaId: c.id })),
        compradorId: compradores[0]?.id ? Number(compradores[0].id) : undefined,
        fechaVenta: fromDateInputToISO(fechaVenta) || new Date().toISOString(),
        monto: montoNum,
        estado: "INICIADA",
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

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCreated?.(created);
        onCancel?.();
      }, 1500);
    } catch (e) {
      console.error("Error creando venta:", e);
      handleBackendError(e);
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
            {/* Columna izquierda */}
            <div className="venta-col">
              <div className={`fieldRow ${errors.loteId ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">LOTE</div>
                  {lockLote && loteSeleccionadoMapId ? (
                    <div className="field-value is-readonly">{loteSeleccionadoMapId}</div>
                  ) : lockLote ? (
                    <div className="field-value is-readonly">—</div>
                  ) : (
                    <div className="field-value p0" style={{ alignItems: "flex-start" }}>
                      <div style={{ width: "100%", position: "relative" }}>
                        <div style={{ position: "relative" }}>
                          <input
                            className={`field-input ${errors.loteId ? "is-invalid" : ""}`}
                            placeholder={loteId ? "" : "Buscar lote por número o calle"}
                            value={loteId && !busquedaLote ? (() => {
                              const loteSeleccionado = lotes.find(l => String(l.id) === String(loteId));
                              if (!loteSeleccionado) return "";
                              const mapId = loteSeleccionado.mapId;
                              return String(mapId).toLowerCase().startsWith("lote") ? mapId : `Lote ${mapId}`;
                            })() : busquedaLote}
                            onChange={(e) => {
                              setBusquedaLote(e.target.value);
                              if (e.target.value && loteId) setLoteId("");
                            }}
                            onFocus={() => {
                              if (loteId) { setBusquedaLote(""); setLoteId(""); }
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
                              const displayText = String(mapId).toLowerCase().startsWith("lote") ? mapId : `Lote ${mapId}`;
                              return (
                                <button
                                  key={l.id}
                                  type="button"
                                  onClick={() => { setLoteId(String(l.id)); setBusquedaLote(""); clearFieldError("loteId"); }}
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
                {errors.loteId && <div className="fieldError">{errors.loteId}</div>}
              </div>

              <div className="field-row">
                <div className="field-label">INMOBILIARIA</div>
                <div className="field-value p0">
                  <NiceSelect value={inmobiliariaId} options={inmoOpts} onChange={setInmobiliariaId} placeholder="(Opcional)" />
                </div>
              </div>

              <div className={`fieldRow ${errors.tipoPago ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">TIPO PAGO</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${errors.tipoPago ? "is-invalid" : ""}`}
                      value={tipoPago}
                      onChange={(e) => { setTipoPago(e.target.value); if (errors.tipoPago) clearFieldError("tipoPago"); }}
                      placeholder="Ej: Contado, Transferencia, Mixto"
                    />
                  </div>
                </div>
                {errors.tipoPago && <div className="fieldError">{errors.tipoPago}</div>}
              </div>
            </div>

            {/* Columna derecha */}
            <div className="venta-col">
              <div className={`fieldRow ${errors.numero ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">NÚMERO DE VENTA</div>
                  <div className="field-value p0">
                    <input
                      className={`field-input ${errors.numero ? "is-invalid" : ""}`}
                      value={numero}
                      onChange={(e) => { setNumero(e.target.value); if (errors.numero) clearFieldError("numero"); }}
                      placeholder="Ej: CCLF-2025-01"
                    />
                  </div>
                </div>
                {errors.numero && <div className="fieldError">{errors.numero}</div>}
              </div>

              <div className="field-row">
                <div className="field-label">FECHA</div>
                <div className="field-value p0">
                  <input className="field-input" type="date" value={fechaVenta} onChange={(e) => setFechaVenta(e.target.value)} />
                </div>
              </div>

              <div className={`fieldRow ${errors.monto ? "hasError" : ""}`}>
                <div className="field-row">
                  <div className="field-label">MONTO</div>
                  <div className="field-value p0 venta-monto-wrapper">
                    <input
                      className={`field-input ${errors.monto ? "is-invalid" : ""}`}
                      type="number"
                      min="0"
                      step="100"
                      value={monto}
                      onChange={(e) => { setMonto(e.target.value); if (errors.monto) clearFieldError("monto"); }}
                      style={{ paddingRight: 50 }}
                    />
                    <span className="venta-monto-currency">USD</span>
                  </div>
                </div>
                {errors.monto && <div className="fieldError">{errors.monto}</div>}
              </div>

              <div className="field-row">
                <div className="field-label">PLAZO ESCRITURA</div>
                <div className="field-value p0">
                  <input className="field-input" type="date" value={plazoEscritura} onChange={(e) => setPlazoEscritura(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Compradores — bloque full-width fuera de la grilla */}
          <CompradoresMultiSelect
            value={compradores}
            onAdd={(p) => {
              setCompradores(prev => [...prev, p]);
              if (errors.compradores) clearFieldError("compradores");
            }}
            onRemove={(id) => {
              setCompradores(prev => prev.filter(c => String(c.id) !== String(id)));
              if (errors.compradores) clearFieldError("compradores");
            }}
            error={errors.compradores}
            personas={personas}
          />

          {errors.general && <div className="lote-error-global">{errors.general}</div>}
        </EditarBase>
      )}
    </>
  );
}
