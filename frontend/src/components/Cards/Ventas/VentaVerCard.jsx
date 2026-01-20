import { useEffect, useMemo, useRef, useState } from "react";
import { getVentaById } from "../../../lib/api/ventas";
import { canEditByEstadoOperativo } from "../../../utils/estadoOperativo";

/**
 * VentaVerCard
 * – Dos columnas; cada fila: label + valor en una misma línea.
 * – Labels con el mismo ancho (se calcula por el más largo).
 * – Fallbacks: dinero/fechas/strings y "Sin información".
 * – Usa `venta` (detalle) cuando está; si no, busca por `ventaId` en `ventas`.
 */
export default function VentaVerCard({
  open,
  onClose,
  onEdit,
  venta,
  ventaId,
  ventas,
  fromSidePanel = false, // Si viene del side panel, ocultar botón Editar
}) {
  // Estado para el detalle completo de la venta
  const [detalleCompleto, setDetalleCompleto] = useState(null);

  // Cargar datos completos cuando se abre el card (igual que ReservaEditarCard)
  useEffect(() => {
    let abort = false;
    async function run() {
      if (!open) {
        setDetalleCompleto(null);
        return;
      }

      // Determinar el ID a usar
      const idToUse = venta?.id ?? ventaId;

      // Siempre llamar a getVentaById para obtener datos completos con relaciones
      // Incluso si viene venta por props, puede no tener todas las relaciones
      if (idToUse != null) {
        try {
          const response = await getVentaById(idToUse);
          const full = response?.data ?? response;
          if (!abort && full) {
            // Preservar mapId del lote si está disponible
            const originalVenta = venta || (Array.isArray(ventas) ? ventas.find(v => `${v.id}` === `${idToUse}`) : null);
            const preservedMapId = originalVenta?.lote?.mapId ?? originalVenta?.lotMapId ?? full?.lote?.mapId ?? full?.lotMapId ?? null;
            
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
            
            setDetalleCompleto(enriched);
          }
        } catch (e) {
          console.error("Error obteniendo venta por id:", e);
          // Si falla el GET pero tenemos venta por props, usarla como fallback
          if (venta && !abort) {
            setDetalleCompleto(venta);
          } else if (ventaId != null && Array.isArray(ventas) && !abort) {
            const found = ventas.find(v => `${v.id}` === `${ventaId}`);
            if (found) {
              setDetalleCompleto(found);
            }
          }
        }
      } else if (venta) {
        // Si no hay ID pero viene venta por props, usarla
        if (!abort) setDetalleCompleto(venta);
      }
    }
    run();
    return () => { abort = true; };
  }, [open, venta?.id, ventaId, venta, ventas]);

  // Elegimos primero el objeto de detalle completo; si no llegó, buscamos en la lista
  const sale = useMemo(() => {
    if (detalleCompleto) return detalleCompleto;
    if (venta) return venta;
    if (ventaId != null && Array.isArray(ventas)) {
      return ventas.find((v) => `${v.id}` === `${ventaId}`) || null;
    }
    return null;
  }, [detalleCompleto, venta, ventaId, ventas]);

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

  // Fechas
  const fechaVentaFormatted = fmtDate(sale?.fechaVenta);
  const fechaActualizacion = fmtDate(sale?.updatedAt ?? sale?.updateAt ?? sale?.fechaActualizacion);
  const fechaCreacion = fmtDate(sale?.createdAt ?? sale?.fechaCreacion);

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
    ["FECHA VENTA", fechaVentaFormatted],
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
            {!fromSidePanel && canEditByEstadoOperativo(sale) && (
              <button
                type="button"
                className="cclf-tab thin"
                onClick={() => sale && onEdit?.(sale)}
              >
                Editar Venta
              </button>
            )}

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
