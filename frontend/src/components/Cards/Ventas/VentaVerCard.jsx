import { useEffect, useMemo, useRef, useState } from "react";

/**
 * VentaVerCard
 * – Dos columnas; cada fila: label + valor en una misma línea.
 * – Labels con el mismo ancho (se calcula por el más largo).
 * – Fallbacks: dinero/fechas/strings y “Sin información”.
 * – Usa `venta` (detalle) cuando está; si no, busca por `ventaId` en `ventas`.
 */
export default function VentaVerCard({
  open,
  onClose,
  onEdit,
  venta,
  ventaId,
  ventas,
}) {
  // Elegimos primero el objeto de detalle; si no llegó, buscamos en la lista
  const sale = useMemo(() => {
    if (venta) return venta;
    if (ventaId != null && Array.isArray(ventas)) {
      return ventas.find((v) => `${v.id}` === `${ventaId}`) || null;
    }
    return null;
  }, [venta, ventaId, ventas]);

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

  const capitalizeFirst = (s) =>
    isBlank(s)
      ? NA
      : String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase();

  // Importar helper común para tipo de pago (reutilizable)
  const fmtTipoPago = (tp) => {
    if (isBlank(tp)) return NA;
    return capitalizeFirst(tp);
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

  // Comprador: nombre + apellido, con alternativas por si cambian claves
  const compradorNombre = (() => {
    const n =
      sale?.comprador?.nombre ||
      sale?.buyer?.nombre ||
      sale?.buyer?.firstName;
    const a =
      sale?.comprador?.apellido ||
      sale?.buyer?.apellido ||
      sale?.buyer?.lastName;
    const joined = [n, a].filter(Boolean).join(" ");
    if (!isBlank(joined)) return joined;
    if (!isBlank(n)) return n;
    return NA;
  })();

  // Propietario: primero `venta.propietario`, si no `venta.lote.propietario`
  const propietarioNombre = (() => {
    const p =
      sale?.propietario ||
      sale?.owner ||
      sale?.lote?.propietario ||
      sale?.lote?.owner ||
      null;
    const n = p?.nombre || p?.firstName || p?.name;
    const a = p?.apellido || p?.lastName || p?.surname;
    const joined = [n, a].filter(Boolean).join(" ");
    if (!isBlank(joined)) return joined;
    if (!isBlank(n)) return n;
    return NA;
  })();

  // Fechas: venta primero, si no existen intentamos variantes y/o las del lote
  const fechaVenta = fmtDate(sale?.fechaVenta);
  const fechaActualizacion = fmtDate(
    sale?.updatedAt ??
      sale?.updateAt ??
      sale?.fechaActualizacion ??
      sale?.lote?.updatedAt ??
      sale?.lote?.updateAt
  );
  const fechaCreacion = fmtDate(
    sale?.createdAt ??
      sale?.creadoEl ??
      sale?.fechaCreacion ??
      sale?.lote?.createdAt ??
      sale?.lote?.creadoEl
  );

  // Orden solicitado: comprador/propietario a la izquierda; número/fechas/plazo a la derecha
  const leftPairs = [
    ["LOTE N°", safe(sale?.lote?.mapId ?? sale?.lotMapId ?? sale?.loteId)],
    ["MONTO", fmtMoney(sale?.monto)],
    ["ESTADO DE VENTA", titleCaseEstado(sale?.estado)],
    ["INMOBILIARIA", safe(sale?.inmobiliaria?.nombre)],
    ["COMPRADOR", compradorNombre],
    ["PROPIETARIO", propietarioNombre],
  ];

  const rightPairs = [
    ["NÚMERO DE VENTA", safe(sale?.numero)],
    ["FECHA VENTA", fechaVenta],
    ["TIPO DE PAGO", fmtTipoPago(sale?.tipoPago)],
    ["PLAZO ESCRITURA", fmtDate(sale?.plazoEscritura)],
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
  }, [open, sale]);

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
          <h2 className="cclf-card__title">{`Venta N° ${sale?.numero ?? sale?.id ?? "—"}`}</h2>

          <div className="cclf-card__actions">
            <button
              type="button"
              className="cclf-tab thin"
              onClick={() => sale && onEdit?.(sale)}
            >
              Editar Venta
            </button>

            <button type="button" className="cclf-btn-close" onClick={onClose}>
              <span className="cclf-btn-close__x">×</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="cclf-card__body">
          <h3 className="venta-section-title">Información de la venta</h3>

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

          {!!sale?.reserva && (
            <div className="reserva-box" style={{ marginTop: 18 }}>
              <div className="reserva-title">Reserva</div>
              <div className="venta-grid" style={{ ["--sale-label-w"]: `${labelW}px` }}>
                <div className="venta-col">
                  <div className="field-row">
                    <div className="field-label">RESERVA ID</div>
                    <div className="field-value" style={valueStyle(safe(sale.reserva.id))}>
                      {safe(sale.reserva.id)}
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field-label">ESTADO RESERVA</div>
                    <div className="field-value" style={valueStyle(safe(sale.reserva.estado))}>
                      {titleCaseEstado(sale.reserva.estado)}
                    </div>
                  </div>
                </div>
                <div className="venta-col">
                  <div className="field-row">
                    <div className="field-label">MONTO RESERVA/SEÑA</div>
                    <div className="field-value" style={valueStyle(fmtMoney(sale.reserva.monto))}>
                      {fmtMoney(sale.reserva.monto)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
