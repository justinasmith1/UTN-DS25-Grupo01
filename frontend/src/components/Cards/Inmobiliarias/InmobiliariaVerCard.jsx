import { useEffect, useMemo, useRef, useState } from "react";

/**
 * InmobiliariaVerCard
 * - Se agregaron: Estado y Fecha de Baja (con estilos condicionales).
 */
export default function InmobiliariaVerCard({
  open,
  onClose,
  onEdit,
  inmobiliaria,
  inmobiliariaId,
  inmobiliarias,
}) {
  const inmob = useMemo(() => {
    if (inmobiliaria) return inmobiliaria;
    if (inmobiliariaId != null && Array.isArray(inmobiliarias)) {
      return inmobiliarias.find((i) => `${i.id}` === `${inmobiliariaId}`) || null;
    }
    return null;
  }, [inmobiliaria, inmobiliariaId, inmobiliarias]);

  const NA = "Sin información";
  const isBlank = (v) =>
    v === null ||
    v === undefined ||
    (typeof v === "string" && v.trim().length === 0);

  const fmtMoney = (val) => {
    if (isBlank(val)) return NA;
    const n =
      typeof val === "number"
        ? val
        : Number(String(val).replace(/[^\d.-]/g, ""));
    if (!isFinite(n)) return NA;
    return n.toLocaleString("es-AR", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  };

  const fmtDate = (d) => {
    if (isBlank(d)) return NA;
    const date =
      typeof d === "string" || typeof d === "number" ? new Date(d) : d;
    return isNaN(date?.getTime?.()) ? NA : date.toLocaleDateString("es-AR");
  };

  const safe = (v) => (isBlank(v) ? NA : v);

  // --- FECHAS ---
  const fechaActualizacion = fmtDate(
    inmob?.updateAt ?? inmob?.updatedAt ?? inmob?.fechaActualizacion
  );
  const fechaCreacion = fmtDate(
    inmob?.createdAt ?? inmob?.fechaCreacion
  );
  // Nuevo: Fecha de baja
  const fechaBaja = fmtDate(inmob?.fechaBaja);

  // --- COLUMNA IZQUIERDA ---
  const leftPairs = [
    ["NOMBRE", safe(inmob?.nombre)],
    ["RAZÓN SOCIAL", safe(inmob?.razonSocial)],
    ["CONTACTO", safe(inmob?.contacto)],
    ["COMISIÓN X VENTA", inmob?.comxventa != null ? `${inmob.comxventa}%` : NA],
  ];

  // --- COLUMNA DERECHA (Con lógica de colores) ---
  // Estructura: [Label, Valor, ColorOpcional]
  const rightPairs = [
    // 1. Estado (Prioridad alta)
    [
      "ESTADO", 
      inmob?.estado ?? "OPERATIVO", 
      inmob?.estado === "ELIMINADO" ? "#ef4444" : "#10b981" // Rojo si inactiva, Verde si activa
    ],
    // 2. Fecha de Baja (Solo si existe y está inactiva)
    ...(inmob?.fechaBaja 
        ? [["FECHA DE BAJA", fechaBaja, "#ef4444"]] // Texto en rojo
        : []
    ),
    // 3. Fechas estándar
    ["FECHA DE ACTUALIZACIÓN", fechaActualizacion],
    ["FECHA DE CREACIÓN", fechaCreacion],
  ];

  // Cálculo de ancho de labels
  const containerRef = useRef(null);
  const [labelW, setLabelW] = useState(180);
  useEffect(() => {
    const labels = [...leftPairs, ...rightPairs].map(([k]) => k);
    const longest = Math.max(...labels.map((s) => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, inmob]);

  if (!open) return null;

  // Estilo base: gris para NA, casi negro para valor real.
  // Si llega un "customColor", ese tiene prioridad.
  const getValueStyle = (val, customColor) => {
    if (customColor) return { color: customColor, fontWeight: 600 };
    return { color: val === NA ? "#6B7280" : "#111827" };
  };

  return (
    <div className="cclf-overlay" onClick={onClose}>
      <div
        className="cclf-card"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
        style={{ ["--sale-label-w"]: `${labelW}px` }}
      >
        <div className="cclf-card__header">
          <h2 className="cclf-card__title">{` ${inmob?.nombre ?? "—"}`}</h2>
          <div className="cclf-card__actions">
            <button
              type="button"
              className="cclf-tab thin"
              onClick={() => inmob && onEdit?.(inmob)}
            >
              Editar Inmobiliaria
            </button>
            <button type="button" className="cclf-btn-close" onClick={onClose}>
              <span className="cclf-btn-close__x">×</span>
            </button>
          </div>
        </div>

        <div className="cclf-card__body">
          <h3 className="venta-section-title">Información de la inmobiliaria</h3>

          <div className="venta-grid" style={{ ["--sale-label-w"]: `${labelW}px` }}>
            {/* IZQUIERDA */}
            <div className="venta-col">
              {leftPairs.map(([label, value]) => (
                <div className="field-row" key={label}>
                  <div className="field-label">{label}</div>
                  <div className="field-value" style={getValueStyle(value)}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* DERECHA */}
            <div className="venta-col">
              {rightPairs.map(([label, value, customColor]) => (
                <div className="field-row" key={label}>
                  <div className="field-label" style={customColor ? { color: customColor } : {}}>
                    {label}
                  </div>
                  {/* Pasamos el customColor al estilo */}
                  <div className="field-value" style={getValueStyle(value, customColor)}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}