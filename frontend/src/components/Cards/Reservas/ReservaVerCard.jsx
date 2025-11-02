import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ReservaVerCard
 * – Dos columnas; cada fila: label + valor en una misma línea.
 * – Labels con el mismo ancho (se calcula por el más largo).
 * – Fallbacks: dinero/fechas/strings y "Sin información".
 * – Usa `reserva` (detalle) cuando está; si no, busca por `reservaId` en `reservas`.
 */
export default function ReservaVerCard({
  open,
  onClose,
  onEdit,
  reserva,
  reservaId,
  reservas,
}) {
  // Elegimos primero el objeto de detalle; si no llegó, buscamos en la lista
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

  // Lote: mostrar ID o información del lote
  const loteInfo = (() => {
    if (res?.lote?.id) {
      const num = res?.lote?.numero || res?.lote?.id;
      return `Lote N° ${num}`;
    }
    return res?.loteId ? `Lote N° ${res.loteId}` : NA;
  })();

  // Fechas
  const fechaReserva = fmtDate(res?.fechaReserva);
  const fechaActualizacion = fmtDate(
    res?.updatedAt ?? res?.updateAt ?? res?.fechaActualizacion
  );
  const fechaCreacion = fmtDate(
    res?.createdAt ?? res?.fechaCreacion
  );

  // Orden: campos principales a la izquierda; fechas a la derecha
  const leftPairs = [
    ["LOTE", loteInfo],
    ["CLIENTE", clienteNombre],
    ["INMOBILIARIA", safe(res?.inmobiliaria?.nombre)],
    ["ESTADO", titleCaseEstado(res?.estado)],
    ["SEÑA", res?.seña != null ? fmtMoney(res.seña) : NA],
  ];

  const rightPairs = [
    ["FECHA RESERVA", fechaReserva],
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
  }, [open, res]);

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
          <h2 className="cclf-card__title">{`Reserva N° ${res?.id ?? "—"}`}</h2>

          <div className="cclf-card__actions">
            <button
              type="button"
              className="cclf-tab thin"
              onClick={() => res && onEdit?.(res)}
            >
              Editar Reserva
            </button>

            <button type="button" className="cclf-btn-close" onClick={onClose}>
              <span className="cclf-btn-close__x">×</span>
            </button>
          </div>
        </div>

        {/* Body */}
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

