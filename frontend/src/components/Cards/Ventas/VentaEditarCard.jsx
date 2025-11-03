// src/components/Ventas/VentaEditarCard.jsx
import { useEffect, useRef, useState } from "react";
import EditarBase from "../Base/EditarBase.jsx";
import { updateVenta, getVentaById } from "../../../lib/api/ventas.js";
import { getAllInmobiliarias } from "../../../lib/api/inmobiliarias.js";

/** Estados: value técnico + label Title Case */
const ESTADOS = [
  { value: "INICIADA",   label: "Iniciada" },
  { value: "CON_BOLETO", label: "Con Boleto" },
  { value: "FINALIZADA", label: "Finalizada" },
  { value: "CANCELADA",  label: "Cancelada" },
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

/* -------------------------- Helper dinero (como VerVentaCard) -------------------------- */
function fmtMoney(val) {
  const NA = "Sin información";
  const isBlank = (v) =>
    v === null ||
    v === undefined ||
    (typeof v === "string" && v.trim().length === 0);
  
  if (isBlank(val)) return NA;
  const n =
    typeof val === "number"
      ? val
      : Number(String(val).replace(/[^\d.-]/g, ""));
  if (!isFinite(n)) return NA;
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
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

  // Solo incluir placeholder como opción si showPlaceholderOption es true
  const optionsToShow = showPlaceholderOption && placeholder 
    ? [{ value: "", label: placeholder }, ...options]
    : options;

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
          {optionsToShow.map(opt => (
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

export default function VentaEditarCard({
  open,
  venta,                   // opcional: si viene completa, se usa
  ventaId,                 // opcional: si viene id, se hace GET
  ventas,                  // opcional: lista cache para buscar por id
  onCancel,
  onSaved,
  inmobiliarias: propsInmob = [], // opcional
  entityType = "Venta",    // tipo de entidad para el mensaje de éxito (Venta, Reserva, etc.)
}) {
  /* 1) HOOKS SIEMPRE ARRIBA (sin returns condicionales) */
  const [detalle, setDetalle] = useState(venta || null);
  const [inmobiliarias, setInmobiliarias] = useState(propsInmob || []);
  const [saving, setSaving] = useState(false);

  // evita múltiples llamados a inmobiliarias
  const fetchedInmobRef = useRef(false);

  // ancho de label como en VerCard
  const [labelW, setLabelW] = useState(180);
  const containerRef = useRef(null);

  /* 2) GET de venta al abrir y cuando cambia la prop venta (igual patrón que VerCard) */
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) return;

      // Si viene venta por props, usarla (esto se ejecuta también cuando venta cambia)
      if (venta) { 
        setDetalle(venta); 
        return; 
      }

      if (ventaId != null && Array.isArray(ventas)) {
        const found = ventas.find(v => `${v.id}` === `${ventaId}`);
        if (found) { 
          setDetalle(found); 
          return; 
        }
      }

      if (ventaId != null) {
        try {
          const response = await getVentaById(ventaId);
          const full = response?.data ?? response;
          if (!abort && full) setDetalle(full);
        } catch (e) {
          console.error("Error obteniendo venta por id:", e);
        }
      }
    }
    run();
    return () => { abort = true; };
  }, [open, ventaId, ventas, venta?.id, venta?.monto]); // Agregar venta?.id y venta?.monto para detectar cambios

  /* 3) Resetear estados cuando el modal se cierra o se abre con otra venta */
  useEffect(() => {
    if (!open) {
      fetchedInmobRef.current = false;
      setSaving(false);
      setShowSuccess(false);
    } else {
      // Resetear estados al abrir con una nueva venta
      setSaving(false);
      setShowSuccess(false);
    }
  }, [open, detalle?.id]); // Resetear también cuando cambia la venta (detalle.id)

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
    // importante: solo depende de "open" para no re-ejecutar en cada render
  }, [open, propsInmob]);

  /* 5) STATES EDITABLES derivados de 'detalle' */
  // Fechas con todos los posibles nombres que vi en tu back
  const fechaVentaISO =
    detalle?.fechaVenta ?? detalle?.fecha_venta ?? null;
  // Backend usa updateAt (sin 'd'), mapeamos a updatedAt para consistencia
  const fechaActISO =
    detalle?.updatedAt ?? detalle?.updateAt ?? detalle?.fechaActualizacion ?? null;
  const fechaCreISO =
    detalle?.createdAt ?? detalle?.fechaCreacion ?? null;

  const initialInmobId =
    detalle?.inmobiliaria?.id ?? detalle?.inmobiliariaId ?? "";

  const base = {
    estado: String(detalle?.estado ?? "INICIADA"),
    monto: detalle?.monto != null ? String(detalle.monto) : "",
    tipoPago: detalle?.tipoPago ?? "",
    fechaVenta: toDateInputValue(fechaVentaISO),
    plazoEscritura: toDateInputValue(detalle?.plazoEscritura),
    inmobiliariaId: initialInmobId,
  };

  const [estado, setEstado] = useState(base.estado);
  const [monto, setMonto] = useState(base.monto);
  const [tipoPago, setTipoPago] = useState(base.tipoPago);
  const [fechaVenta, setFechaVenta] = useState(base.fechaVenta);
  const [plazoEscritura, setPlazoEscritura] = useState(base.plazoEscritura);
  const [inmobiliariaId, setInmobiliariaId] = useState(base.inmobiliariaId);
  const [showSuccess, setShowSuccess] = useState(false);

  // re-sync cuando cambia 'detalle' o se reabre
  useEffect(() => {
    if (!open || !detalle) return;
    setEstado(base.estado);
    setMonto(base.monto);
    setTipoPago(base.tipoPago);
    setFechaVenta(base.fechaVenta);
    setPlazoEscritura(base.plazoEscritura);
    setInmobiliariaId(base.inmobiliariaId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, detalle?.id, detalle?.monto]);

  /* 6) ancho de label como en VerCard */
  useEffect(() => {
    const labels = [
      "LOTE N°","MONTO","ESTADO DE VENTA","INMOBILIARIA","COMPRADOR","PROPIETARIO",
      "FECHA VENTA","TIPO DE PAGO","PLAZO ESCRITURA","FECHA DE ACTUALIZACIÓN","FECHA DE CREACIÓN"
    ];
    const longest = Math.max(...labels.map(s => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, detalle?.id]);

  /* 7) Guardado (PATCH minimal y validado) */
  function buildPatch() {
    const patch = {};

    if (estado !== (detalle?.estado ?? "")) patch.estado = estado;

    if (monto !== (detalle?.monto != null ? String(detalle.monto) : "")) {
      const n = Number(monto);
      if (!(monto === "" || (Number.isFinite(n) && n >= 0))) {
        throw new Error("El monto debe ser un número ≥ 0.");
      }
      patch.monto = monto === "" ? null : n;
    }

    if ((detalle?.tipoPago ?? "") !== (tipoPago ?? "")) {
      patch.tipoPago = tipoPago || null;
    }

    const prevFV = toDateInputValue(fechaVentaISO);
    if (prevFV !== fechaVenta) {
      patch.fechaVenta = fechaVenta ? fromDateInputToISO(fechaVenta) : null;
    }

    const prevPE = toDateInputValue(detalle?.plazoEscritura);
    if (prevPE !== plazoEscritura) {
      // Si el campo está vacío, enviamos null; si tiene valor, lo convertimos a ISO
      patch.plazoEscritura = plazoEscritura && plazoEscritura.trim() !== "" 
        ? fromDateInputToISO(plazoEscritura) 
        : null;
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
      
      const response = await updateVenta(detalle.id, patch);
      const updated = response?.data ?? response;
      
      // Actualizar estado del padre inmediatamente
      onSaved?.(updated);
      
      // Mostrar animación de éxito
      setShowSuccess(true);
      
      // Esperar un momento para mostrar la animación antes de cerrar
      setTimeout(() => {
        setShowSuccess(false);
        setSaving(false);
        onCancel?.();
      }, 1500);
    } catch (e) {
      console.error("Error guardando venta:", e);
      setSaving(false);
      alert(e?.message || "No se pudo guardar la venta.");
    }
  }

  function handleReset() {
    setEstado(base.estado);
    setMonto(base.monto);
    setTipoPago(base.tipoPago);
    setFechaVenta(base.fechaVenta);
    setPlazoEscritura(base.plazoEscritura);
    setInmobiliariaId(base.inmobiliariaId);
  }

  /* 8) Render */
  const NA = "Sin información";

  const compradorNombre = (() => {
    const n = detalle?.comprador?.nombre, a = detalle?.comprador?.apellido;
    const j = [n, a].filter(Boolean).join(" ");
    return j || NA;
  })();

  const propietarioNombre = (() => {
    // 1) propietario directo
    const p1 = detalle?.propietario;
    // 2) propietario del lote (fallback)
    const p2 = detalle?.lote?.propietario;
    // 3) nombre plano opcional
    const nombrePlano = detalle?.propietarioNombre;
    const p = p1 || p2;

    if (p) {
      const n = p?.nombre, a = p?.apellido;
      const j = [n, a].filter(Boolean).join(" ");
      return j || NA;
    }
    return nombrePlano || NA;
  })();

  const fechaAct = fechaActISO
    ? new Date(fechaActISO).toLocaleDateString("es-AR")
    : NA;
  const fechaCre = fechaCreISO
    ? new Date(fechaCreISO).toLocaleDateString("es-AR")
    : NA;

  if (!open && !showSuccess) return null;

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
                ¡{entityType} guardada exitosamente!
              </h3>
          </div>
        </div>
      )}

      <EditarBase
        open={open}
        title={`Venta N° ${detalle?.id ?? "—"}`}
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
      {/* Podés mover el chevron del select nativo con esta var si hiciera falta */}
      <div style={{ "--sale-label-w": `${labelW}px`, "--select-chevron-x": "26px" }}>
        <h3 className="venta-section-title">Información de la venta</h3>

        <div className="venta-grid" ref={containerRef}>
          {/* Columna izquierda */}
          <div className="venta-col">
            <div className="field-row">
              <div className="field-label">LOTE N°</div>
              <div className="field-value is-readonly">{detalle?.loteId ?? NA}</div>
            </div>

            <div className="field-row">
              <div className="field-label">MONTO</div>
              <div className="field-value p0" style={{ position: "relative" }}>
                <input
                  className="field-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
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
                  {monto && Number(monto) > 0 ? "USD" : ""}
                </span>
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">ESTADO DE VENTA</div>
              <div className="field-value p0">
                <NiceSelect
                  value={estado}
                  options={ESTADOS}
                  placeholder="Seleccionar estado"
                  onChange={setEstado}
                  showPlaceholderOption={false}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">INMOBILIARIA</div>
              <div className="field-value p0">
                <NiceSelect
                  value={inmobiliariaId || ""}
                  options={inmobiliarias.map(i => ({ value: i.id, label: i.nombre }))}
                  placeholder="Sin información"
                  onChange={setInmobiliariaId}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">COMPRADOR</div>
              <div className="field-value is-readonly">{compradorNombre}</div>
            </div>

            <div className="field-row">
              <div className="field-label">PROPIETARIO</div>
              <div className="field-value is-readonly">{propietarioNombre}</div>
            </div>
          </div>

          {/* Columna derecha */}
          <div className="venta-col">
            <div className="field-row">
              <div className="field-label">FECHA VENTA</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="date"
                  value={fechaVenta}
                  onChange={(e) => setFechaVenta(e.target.value)}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">TIPO DE PAGO</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="text"
                  value={tipoPago}
                  onChange={(e) => setTipoPago(e.target.value)}
                  placeholder="Contado, Transferencia, Cuotas…"
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field-label">PLAZO ESCRITURA</div>
              <div className="field-value p0">
                <input
                  className="field-input"
                  type="date"
                  value={plazoEscritura}
                  onChange={(e) => setPlazoEscritura(e.target.value)}
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
