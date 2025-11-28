// src/components/Reservas/ReservaEditarCard.jsx
import { useEffect, useRef, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { updateReserva, getReservaById } from "../../../lib/api/reservas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";

/** Estados de reserva: value técnico + label Title Case */
const ESTADOS_RESERVA = [
  { value: "ACTIVA", label: "Activa" },
  { value: "CANCELADA", label: "Cancelada" },
  { value: "ACEPTADA", label: "Aceptada" },
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
function fromDateInputToISO(s) {
  if (!s || !s.trim()) return null;
  // El backend espera un string ISO válido
  // Formato de entrada: YYYY-MM-DD (del input type="date")
  const date = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/* ----------------------- Select custom sin librerías ----------------------- */
function NiceSelect({ value, options, placeholder = "Sin información", onChange, showPlaceholderOption = true }) {
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
          {(showPlaceholderOption ? [{ value: "", label: placeholder }, ...options] : options).map(opt => (
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

export default function ReservaEditarCard({
  open,
  reserva,                   // opcional: si viene completa, se usa
  reservaId,                  // opcional: si viene id, se hace GET
  reservas,                   // opcional: lista cache para buscar por id
  onCancel,
  onSaved,
  inmobiliarias: propsInmob = [], // opcional
  entityType = "Reserva",     // tipo de entidad para el mensaje de éxito
}) {
  /* 1) HOOKS SIEMPRE ARRIBA (sin returns condicionales) */
  const [detalle, setDetalle] = useState(reserva || null);
  const [inmobiliarias, setInmobiliarias] = useState(propsInmob || []);
  const [saving, setSaving] = useState(false);

  // evita múltiples llamados a inmobiliarias
  const fetchedInmobRef = useRef(false);

  // ancho de label como en VerCard
  const [labelW, setLabelW] = useState(180);
  const containerRef = useRef(null);

  /* 2) GET de reserva al abrir y cuando cambia la prop reserva */
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) return;

      // Determinar el ID a usar
      const idToUse = reserva?.id ?? reservaId;

      // Siempre llamar a getReservaById para obtener datos completos con relaciones
      // Incluso si viene reserva por props, puede no tener todas las relaciones
      if (idToUse != null) {
        try {
          const response = await getReservaById(idToUse);
          const full = response?.data ?? response;
          if (!abort && full) {
            // Preservar mapId del lote si está disponible en la reserva original o en la lista
            const originalReserva = reserva || (Array.isArray(reservas) ? reservas.find(r => `${r.id}` === `${idToUse}`) : null);
            const preservedMapId = originalReserva?.lote?.mapId ?? originalReserva?.lotMapId ?? full?.lote?.mapId ?? full?.lotMapId ?? null;
            
            // Enriquecer el detalle con mapId si está disponible
            const enriched = preservedMapId && full?.lote
              ? {
                  ...full,
                  lotMapId: preservedMapId,
                  lote: {
                    ...full.lote,
                    mapId: preservedMapId,
                  },
                }
              : preservedMapId
              ? {
                  ...full,
                  lotMapId: preservedMapId,
                }
              : full;
            
            setDetalle(enriched);
          }
        } catch (e) {
          console.error("Error obteniendo reserva por id:", e);
          // Si falla el GET pero tenemos reserva por props, usarla como fallback
          if (reserva && !abort) {
            setDetalle(reserva);
          } else if (reservaId != null && Array.isArray(reservas) && !abort) {
            const found = reservas.find(r => `${r.id}` === `${reservaId}`);
            if (found) {
              setDetalle(found);
            }
          }
        }
      } else if (reserva) {
        // Si no hay ID pero viene reserva por props, usarla
        if (!abort) setDetalle(reserva);
      }
    }
    run();
    return () => { abort = true; };
  }, [open, reservaId, reservas, reserva?.id]);

  /* 3) Resetear estados cuando el modal se cierra o se abre con otra reserva */
  useEffect(() => {
    if (!open) {
      fetchedInmobRef.current = false;
      setSaving(false);
      setShowSuccess(false);
    } else {
      // Resetear estados al abrir con una nueva reserva
      setSaving(false);
      setShowSuccess(false);
    }
  }, [open, detalle?.id]);

  /* 4) GET de inmobiliarias UNA sola vez por apertura */
  useEffect(() => {
    let abort = false;

    function normalizeList(raw) {
      // getAllInmobiliarias devuelve { data: [...], meta: {...} }
      let list = [];
      
      if (raw?.data && Array.isArray(raw.data)) {
        list = raw.data;
      } else if (Array.isArray(raw)) {
        list = raw;
      } else if (raw?.data?.data?.inmobiliarias && Array.isArray(raw.data.data.inmobiliarias)) {
        list = raw.data.data.inmobiliarias;
      } else if (raw?.data?.inmobiliarias && Array.isArray(raw.data.inmobiliarias)) {
        list = raw.data.inmobiliarias;
      } else if (raw?.inmobiliarias && Array.isArray(raw.inmobiliarias)) {
        list = raw.inmobiliarias;
      }
      
      const arr = Array.isArray(list) ? list : [];
      return arr
        .map(x => ({
          id: x.id ?? x.idInmobiliaria ?? x._id ?? "",
          nombre: x.nombre ?? x.razonSocial ?? "Sin información",
        }))
        .filter(i => i.id);
    }

    async function run() {
      if (!open || fetchedInmobRef.current) return;

      // si vienen por props y tienen longitud, no llamo API
      if (propsInmob && propsInmob.length) {
        const norm = normalizeList(propsInmob);
        setInmobiliarias(norm);
        fetchedInmobRef.current = true;
        return;
      }

      try {
        const response = await getAllInmobiliarias({});
        const norm = normalizeList(response);
        if (!abort) {
          setInmobiliarias(norm);
          fetchedInmobRef.current = true;
        }
      } catch (e) {
        console.error("Error obteniendo inmobiliarias:", e);
        if (!abort) {
          setInmobiliarias([]);
          fetchedInmobRef.current = true;
        }
      }
    }
    run();
    return () => { abort = true; };
  }, [open, propsInmob]);

  /* 5) STATES EDITABLES derivados de 'detalle' */
  const fechaReservaISO = detalle?.fechaReserva ?? null;
  const fechaActISO = detalle?.updatedAt ?? detalle?.updateAt ?? detalle?.fechaActualizacion ?? null;
  const fechaCreISO = detalle?.createdAt ?? detalle?.fechaCreacion ?? null;

  const initialInmobId = detalle?.inmobiliaria?.id ?? detalle?.inmobiliariaId ?? "";

  const base = {
    estado: String(detalle?.estado ?? "ACTIVA"),
    fechaReserva: toDateInputValue(fechaReservaISO),
    sena: detalle?.seña != null ? String(detalle.seña) : detalle?.sena != null ? String(detalle.sena) : "",
    inmobiliariaId: initialInmobId,
  };

  const [estado, setEstado] = useState(base.estado);
  const [fechaReserva, setFechaReserva] = useState(base.fechaReserva);
  const [sena, setSena] = useState(base.sena);
  const [inmobiliariaId, setInmobiliariaId] = useState(base.inmobiliariaId);
  const [showSuccess, setShowSuccess] = useState(false);

  // re-sync cuando cambia 'detalle' o se reabre
  useEffect(() => {
    if (!open || !detalle) return;
    setEstado(base.estado);
    setFechaReserva(base.fechaReserva);
    setSena(base.sena);
    setInmobiliariaId(base.inmobiliariaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detalle?.id]);

  /* 6) ancho de label como en VerCard */
  useEffect(() => {
    const labels = [
      "LOTE", "CLIENTE", "INMOBILIARIA", "ESTADO", "SEÑA",
      "FECHA RESERVA", "FECHA DE ACTUALIZACIÓN", "FECHA DE CREACIÓN"
    ];
    const longest = Math.max(...labels.map(s => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, detalle?.id]);

  /* 7) Guardado (PATCH minimal y validado) */
  function buildPatch() {
    const patch = {};

    if (estado !== (detalle?.estado ?? "")) {
      patch.estado = estado;
    }

    const prevFR = toDateInputValue(fechaReservaISO);
    if (prevFR !== fechaReserva) {
      patch.fechaReserva = fechaReserva ? fromDateInputToISO(fechaReserva) : null;
    }

    const prevSena = detalle?.seña != null ? String(detalle.seña) : detalle?.sena != null ? String(detalle.sena) : "";
    if (prevSena !== sena) {
      if (sena === "" || sena.trim() === "") {
        patch.sena = null;
      } else {
        const n = Number(sena);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error("La seña debe ser un número ≥ 0.");
        }
        patch.sena = n;
      }
    }

    const prevInmob = detalle?.inmobiliaria?.id ?? detalle?.inmobiliariaId ?? "";
    if (prevInmob !== (inmobiliariaId ?? "")) {
      patch.inmobiliariaId = inmobiliariaId || null;
    }

    return patch;
  }

  async function handleSave() {
    try {
      setSaving(true);
      const patch = buildPatch();
      
      if (Object.keys(patch).length === 0) { 
        setSaving(false);
        onCancel?.(); 
        return; 
      }
      
      const response = await updateReserva(detalle.id, patch);
      
      // updateReserva devuelve { success: true, data: {...}, message: '...' }
      const updated = response?.data ?? response;
      
      if (!response || !response.success) {
        throw new Error(response?.message || "No se pudo guardar la reserva.");
      }
      
      // Preservar mapId del lote si está disponible
      const mapId = updated?.lote?.mapId ?? detalle?.lote?.mapId ?? updated?.lotMapId ?? detalle?.lotMapId ?? null;
      const enrichedUpdated = mapId && updated?.lote
        ? {
            ...updated,
            lotMapId: mapId,
            lote: {
              ...updated.lote,
              mapId: mapId,
            },
          }
        : mapId
        ? {
            ...updated,
            lotMapId: mapId,
          }
        : updated;
      
      // Actualizar detalle inmediatamente con los valores guardados
      setDetalle(enrichedUpdated);
      
      // Mostrar animación de éxito
      setShowSuccess(true);
      
      // Esperar un momento para mostrar la animación antes de cerrar
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onSaved?.(updated);
        onCancel?.();
      }, 1500);
    } catch (e) {
      console.error("Error guardando reserva:", e);
      setSaving(false);
      alert(e?.message || "No se pudo guardar la reserva.");
    }
  }

  function handleReset() {
    setEstado(base.estado);
    setFechaReserva(base.fechaReserva);
    setSena(base.sena);
    setInmobiliariaId(base.inmobiliariaId);
  }

  /* 8) Render */
  const NA = "Sin información";

  const clienteNombre = (() => {
    const n = detalle?.cliente?.nombre || detalle?.clienteNombre;
    const a = detalle?.cliente?.apellido || detalle?.clienteApellido;
    const j = [n, a].filter(Boolean).join(" ");
    return j || NA;
  })();

  const loteInfo = (() => {
    const mapId = detalle?.lote?.mapId ?? detalle?.lotMapId ?? null;
    if (mapId) {
      // Si el mapId ya contiene "Lote", mostrarlo directamente sin duplicar
      if (String(mapId).toLowerCase().startsWith('lote')) {
        return mapId;
      }
      return `Lote N° ${mapId}`;
    }
    if (detalle?.lote?.id) {
      const num = detalle?.lote?.numero || detalle?.lote?.id;
      return `Lote N° ${num}`;
    }
    return detalle?.loteId ? `Lote N° ${detalle.loteId}` : NA;
  })();

  const fechaAct = fechaActISO
    ? new Date(fechaActISO).toLocaleDateString("es-AR")
    : NA;
  const fechaCre = fechaCreISO
    ? new Date(fechaCreISO).toLocaleDateString("es-AR")
    : NA;

  if (!open || !detalle) return null;

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
            zIndex: 3000,
            animation: "fadeIn 0.2s ease-in",
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
                ¡{entityType} guardada exitosamente!
              </h3>
          </div>
        </div>
      )}

      <EditarBase
        open={open}
        title={`Reserva N° ${detalle?.id ?? "—"}`}
        onCancel={() => {
          // Siempre resetear estados antes de cerrar
          setSaving(false);
          setShowSuccess(false);
          onCancel?.();
        }}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
      >
        <div style={{ "--sale-label-w": `${labelW}px` }}>
          <h3 className="venta-section-title">Información de la reserva</h3>

          <div className="venta-grid" ref={containerRef}>
            {/* Columna izquierda */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">LOTE</div>
                <div className="field-value is-readonly">{loteInfo}</div>
              </div>

              <div className="field-row">
                <div className="field-label">CLIENTE</div>
                <div className="field-value is-readonly">{clienteNombre}</div>
              </div>

              <div className="field-row">
                <div className="field-label">INMOBILIARIA</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={inmobiliariaId || ""}
                    options={inmobiliarias.map(i => ({ value: i.id, label: i.nombre }))}
                    placeholder=""
                    showPlaceholderOption={false}
                    onChange={setInmobiliariaId}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">ESTADO</div>
                <div className="field-value p0">
                  <NiceSelect
                    value={estado}
                    options={ESTADOS_RESERVA}
                    placeholder=""
                    showPlaceholderOption={false}
                    onChange={setEstado}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">SEÑA</div>
                <div className="field-value p0" style={{ position: "relative" }}>
                  <input
                    className="field-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="100"
                    value={sena}
                    onChange={(e) => setSena(e.target.value)}
                    style={{ paddingRight: "50px" }}
                  />
                  {/* Mostrar USD como símbolo al final */}
                  <span style={{ 
                    position: "absolute", 
                    right: "12px", 
                    top: "50%", 
                    transform: "translateY(-50%)",
                    color: "#6B7280",
                    fontSize: "13px",
                    pointerEvents: "none",
                    fontWeight: 500
                  }}>
                    {sena && Number(sena) > 0 ? "USD" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="venta-col">
              <div className="field-row">
                <div className="field-label">FECHA RESERVA</div>
                <div className="field-value p0">
                  <input
                    className="field-input"
                    type="date"
                    value={fechaReserva}
                    onChange={(e) => setFechaReserva(e.target.value)}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-label">FECHA DE ACTUALIZACIÓN</div>
                <div className="field-value is-readonly">{fechaAct}</div>
              </div>

              <div className="field-row">
                <div className="field-label">FECHA DE CREACIÓN</div>
                <div className="field-value is-readonly">{fechaCre}</div>
              </div>
            </div>
          </div>
        </div>
      </EditarBase>
    </>
  );
}

