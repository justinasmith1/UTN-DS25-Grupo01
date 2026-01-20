import { useEffect, useMemo, useRef, useState } from "react";
import { canEditByEstadoOperativo } from "../../../utils/estadoOperativo";

/**
 * ReservaVerCard
 * – Dos columnas; cada fila: label + valor en una misma línea.
 * – Labels con el mismo ancho (se calcula por el más largo).
 * – Fallbacks: dinero/fechas/strings y "Sin información".
 * – Usa `reserva` (detalle) cuando está; si no, busca por `reservaId` en `reservas`.
 * - Se agregó visualización de "PLAZO DE RESERVA" (fechaFinReserva).
 * - Se eliminaron "FECHA DE ACTUALIZACIÓN" y "FECHA DE CREACIÓN".
 */
export default function ReservaVerCard({
  open,
  onClose,
  onEdit,
  reserva,
  reservaId,
  reservas,
  fromSidePanel = false,
}) {
  const res = useMemo(() => {
    if (reserva) return reserva;
    if (reservaId != null && Array.isArray(reservas)) {
      return reservas.find((r) => `${r.id}` === `${reservaId}`) || null;
    }
    return null;
  }, [reserva, reservaId, reservas]);

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
      maximumFractionDigits: 0,
    });
  };

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

  // Cliente: nombre + apellido
  const clienteNombre = (() => {
    const n = res?.cliente?.nombre || res?.clienteNombre || null;
    const a = res?.cliente?.apellido || res?.clienteApellido || null;
    const joined = [n, a].filter(Boolean).join(" ");
    if (!isBlank(joined)) return joined;
    if (!isBlank(n)) return n;
    return NA;
  })();

  // Lote: mostrar mapId o información del lote
  const loteInfo = (() => {
    const mapId = res?.lote?.mapId ?? res?.lotMapId ?? null;
    if (mapId) {
      if (String(mapId).toLowerCase().startsWith('lote')) {
        return mapId;
      }
      return `Lote N° ${mapId}`;
    }
    if (res?.lote?.id) {
      const num = res?.lote?.numero || res?.lote?.id;
      return `Lote N° ${num}`;
    }
    return res?.loteId ? `Lote N° ${res.loteId}` : NA;
  })();

  // --- FECHAS ---
  const fechaReserva = fmtDate(res?.fechaReserva);
  // Agregamos el Plazo (fechaFinReserva)
  const plazoReserva = fmtDate(res?.fechaFinReserva);
  
  // (Se eliminaron fechaActualizacion y fechaCreacion)

  const leftPairs = [
    ["LOTE", loteInfo],
    ["FECHA", fechaReserva],
    ["CLIENTE", clienteNombre],
    ["INMOBILIARIA", safe(res?.inmobiliaria?.nombre) || "La Federala"],
    ["ESTADO", titleCaseEstado(res?.estado)],
  ];

  const rightPairs = [
    ["NÚMERO DE RESERVA", safe(res?.numero)],
    // Agregamos el plazo aquí
    ["PLAZO DE RESERVA", plazoReserva], 
    ["SEÑA", res?.seña != null ? fmtMoney(res.seña) : NA],
    // Se quitaron las filas de fechas de actualización/creación
  ];

  // Un solo ancho de label
  const containerRef = useRef(null);
  const [labelW, setLabelW] = useState(180);
  useEffect(() => {
    const labels = [...leftPairs, ...rightPairs].map(([k]) => k);
    const longest = Math.max(...labels.map((s) => s.length));
    const computed = Math.min(240, Math.max(160, Math.round(longest * 8.6) + 20));
    setLabelW(computed);
  }, [open, res]);

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
          <h2 className="cclf-card__title">{`Reserva N° ${res?.numero ?? res?.id ?? "—"}`}</h2>

          <div className="cclf-card__actions">
            {!fromSidePanel && canEditByEstadoOperativo(res) && (
              <button
                type="button"
                className="cclf-tab thin"
                onClick={() => res && onEdit?.(res)}
              >
                Editar Reserva
              </button>
            )}

            <button type="button" className="cclf-btn-close" onClick={onClose}>
              <span className="cclf-btn-close__x">×</span>
            </button>
          </div>
        </div>

        <div className="cclf-card__body">
          <h3 className="venta-section-title">Información de la reserva</h3>

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