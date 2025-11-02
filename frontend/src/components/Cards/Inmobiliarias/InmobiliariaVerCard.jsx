import { useEffect, useMemo, useRef, useState } from "react";

/**
 * InmobiliariaVerCard
 * – Dos columnas; cada fila: label + valor en una misma línea.
 * – Labels con el mismo ancho (se calcula por el más largo).
 * – Fallbacks: dinero/fechas/strings y "Sin información".
 * – Usa `inmobiliaria` (detalle) cuando está; si no, busca por `inmobiliariaId` en `inmobiliarias`.
 */
export default function InmobiliariaVerCard({
  open,
  onClose,
  onEdit,
  inmobiliaria,
  inmobiliariaId,
  inmobiliarias,
}) {
  // Elegimos primero el objeto de detalle; si no llegó, buscamos en la lista
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

  // Fechas
  const fechaActualizacion = fmtDate(
    inmob?.updateAt ?? inmob?.updatedAt ?? inmob?.fechaActualizacion
  );
  const fechaCreacion = fmtDate(
    inmob?.createdAt ?? inmob?.fechaCreacion
  );

  // Orden: campos principales a la izquierda; fechas a la derecha
  const leftPairs = [
    ["NOMBRE", safe(inmob?.nombre)],
    ["RAZÓN SOCIAL", safe(inmob?.razonSocial)],
    ["CONTACTO", safe(inmob?.contacto)],
    ["COMISIÓN X VENTA", inmob?.comxventa != null ? fmtMoney(inmob.comxventa) : NA],
  ];

  const rightPairs = [
    ["FECHA DE ACTUALIZACIÓN", fechaActualizacion],
    ["FECHA DE CREACIÓN", fechaCreacion],
  ];

  // Un solo ancho de label, calculado por el más largo
  const containerRef = useRef(null);
  const [labelW, setLabelW] = useState(180);
  useEffect(() => {
    const labels = [...leftPairs, ...rightPairs].map(([k]) => k);
    const longest = Math.max(...labels.map((s) => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, inmob]);

  if (!open) return null;

  // Contraste: gris para NA, casi negro para valor real
  const valueStyle = (val) => ({ color: val === NA ? "#6B7280" : "#111827" });

  return (
    <div className="cclf-overlay" onClick={onClose}>
      <div
        className="cclf-card"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
        style={{ ["--sale-label-w"]: `${labelW}px` }}
      >
        {/* Header */}
        <div className="cclf-card__header">
          <h2 className="cclf-card__title">{`Inmobiliaria N° ${inmob?.id ?? "—"}`}</h2>

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

        {/* Body */}
        <div className="cclf-card__body">
          <h3 className="venta-section-title">Información de la inmobiliaria</h3>

          <div className="venta-grid" style={{ ["--sale-label-w"]: `${labelW}px` }}>
            <div className="venta-col">
              {leftPairs.map(([label, value]) => (
                <div className="field-row" key={label}>
                  <div className="field-label">{label}</div>
                  <div className="field-value" style={valueStyle(value)}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="venta-col">
              {rightPairs.map(([label, value]) => (
                <div className="field-row" key={label}>
                  <div className="field-label">{label}</div>
                  <div className="field-value" style={valueStyle(value)}>
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

