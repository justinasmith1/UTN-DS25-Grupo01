import { useEffect, useMemo, useRef, useState } from "react";
import { isPrioridadEliminada } from "../../../utils/prioridadHelpers";

/**
 * PrioridadVerCard
 * – Dos columnas; cada fila: label + valor en una misma línea.
 * – Labels con el mismo ancho (se calcula por el más largo).
 * – Fallbacks: fechas/strings y "Sin información".
 */
export default function PrioridadVerCard({
  open,
  onClose,
  onEdit,
  prioridad,
  prioridadId,
  prioridades,
  fromSidePanel = false,
}) {
  const pr = useMemo(() => {
    if (prioridad) return prioridad;
    if (prioridadId != null && Array.isArray(prioridades)) {
      return prioridades.find((p) => `${p.id}` === `${prioridadId}`) || null;
    }
    return null;
  }, [prioridad, prioridadId, prioridades]);

  const estaEliminada = isPrioridadEliminada(pr);

  const NA = "Sin información";
  const isBlank = (v) =>
    v === null ||
    v === undefined ||
    (typeof v === "string" && v.trim().length === 0);

  const fmtDate = (d) => {
    if (isBlank(d)) return NA;
    const date =
      typeof d === "string" || typeof d === "number" ? new Date(d) : d;
    return isNaN(date?.getTime?.()) ? NA : date.toLocaleDateString("es-AR");
  };

  const titleCaseEstado = (s) => {
    if (isBlank(s)) return NA;
    const t = String(s).toLowerCase().replace(/_/g, " ");
    return t
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const safe = (v) => (isBlank(v) ? NA : v);

  // Lote: mostrar "Lote {fraccion}-{numero}"
  const loteInfo = (() => {
    if (pr?.lote) {
      const fraccion = pr.lote?.fraccion?.numero;
      const numero = pr.lote?.numero;
      if (fraccion != null && numero != null) {
        return `Lote ${fraccion}-${numero}`;
      }
      if (pr.lote?.mapId) {
        const mapId = String(pr.lote.mapId);
        return mapId.toLowerCase().startsWith('lote') ? mapId : `Lote ${mapId}`;
      }
      if (pr.lote?.id) {
        return `Lote ID: ${pr.lote.id}`;
      }
    }
    return pr?.loteId ? `Lote ID: ${pr.loteId}` : NA;
  })();

  // Owner/Inmobiliaria
  const ownerInfo = (() => {
    if (pr?.ownerType === 'CCLF') return 'La Federala';
    if (pr?.inmobiliaria?.nombre) return pr.inmobiliaria.nombre;
    if (pr?.inmobiliariaNombre) return pr.inmobiliariaNombre;
    return NA;
  })();

  // N° Prioridad
  const numeroPrioridad = (() => {
    if (pr?.numero) return pr.numero;
    if (pr?.id != null) return `PRI-${String(pr.id).padStart(6, '0')}`;
    return NA;
  })();

  const fechaInicio = fmtDate(pr?.fechaInicio);
  const fechaFin = fmtDate(pr?.fechaFin);
  const fechaCreado = fmtDate(pr?.createdAt);
  const fechaActualizado = fmtDate(pr?.updatedAt);

  // Layout 4x2 (4 filas x 2 columnas) en orden fijo
  const leftPairs = [
    ["LOTE", loteInfo],
    ["ESTADO", titleCaseEstado(pr?.estado)],
    ["FECHA INICIO", fechaInicio],
    ["CREADO", fechaCreado],
  ];

  const rightPairs = [
    ["N° PRIORIDAD", numeroPrioridad],
    ["INMOBILIARIA", ownerInfo],
    ["VENCIMIENTO", fechaFin],
    ["ACTUALIZADO", fechaActualizado],
  ];

  // Un solo ancho de label
  const containerRef = useRef(null);
  const [labelW, setLabelW] = useState(180);
  useEffect(() => {
    const labels = [...leftPairs, ...rightPairs].map(([k]) => k);
    const longest = Math.max(...labels.map((s) => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, pr]);

  if (!open) return null;

  const valueStyle = (val) => ({ color: val === NA ? "#6B7280" : "#111827" });

  return (
    <div className="cclf-overlay" onClick={onClose}>
      <div
        className="cclf-card"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
        style={{ ["--sale-label-w"]: `${labelW}px` }}
      >
        <div className="cclf-card__header">
          <h2 className="cclf-card__title">{`Prioridad N° ${numeroPrioridad}`}</h2>

          <div className="cclf-card__actions">
            {!fromSidePanel && !estaEliminada && (
              <button
                type="button"
                className="cclf-tab thin"
                onClick={() => pr && onEdit?.(pr)}
              >
                Editar Prioridad
              </button>
            )}

            <button type="button" className="cclf-btn-close" onClick={onClose}>
              <span className="cclf-btn-close__x">×</span>
            </button>
          </div>
        </div>

        <div className="cclf-card__body">
          <h3 className="venta-section-title">Información de la prioridad</h3>

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
