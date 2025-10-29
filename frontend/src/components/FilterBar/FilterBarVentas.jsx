// components/FilterBar/FilterBarVentas.jsx
// Wrapper de filtros para Ventas. Cambios mínimos:
// - Catalogs correctos: TIPO_PAGO e INMOBILIARIAS (no SUBESTADOS/CALLES)
// - Emite onChange con shape que espera Ventas.jsx (texto, estados, tipoPago, inmobiliarias, fechaVentaMin/Max, montoMin/Max)

import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { ventasFilterPreset } from "./presets/ventas.preset";
import { ventasChipsFrom, nice } from "./utils/ventasChips";

export default function FilterBarVentas({
  // estado externo y callback que espera Ventas.jsx
  value,
  onChange,

  // opcionales / métricas UI
  isLoading,
  total,
  filtrados,
  onClear,

  // fallbacks si el preset no expone las listas:
  tipoPagoOpts,        // [{ value, label }]
  inmobiliariasOpts,   // [{ value: id, label: nombre }]

  variant = "dashboard",
  userRole = "GENERAL",
}) {
  // ===== Campos (lo que entiende FilterBarBase) =====
  const fields = useMemo(() => [
    { id: "q",            type: "search",      label: "Búsqueda",       placeholder: "ID, lote, monto...", defaultValue: "" },
    { id: "estado",       type: "multiSelect", label: "Estado",         defaultValue: [] },
    { id: "tipoPago",     type: "multiSelect", label: "Tipo de Pago",   defaultValue: [] },
    { id: "inmobiliaria", type: "multiSelect", label: "Inmobiliaria",   defaultValue: [], useGrid: true },
    { id: "fechaVenta",   type: "dateRange",   label: "Fecha de Venta", defaultValue: { min: null, max: null } },
    { id: "monto",        type: "range",       label: "Monto",          defaultValue: { min: null, max: null } },
    // si después querés usarlo:
    // { id: "plazoEscritura", type: "range", label: "Plazo Escritura", defaultValue: { min: null, max: null } },
  ], []);

  // ===== Catálogos correctos para Ventas =====
  const catalogs = useMemo(() => {
    // Tomamos del preset si existen; si no, usamos los fallbacks por props
    const ESTADOS = ventasFilterPreset?.catalogs?.ESTADOS ?? [];
    const TIPO_PAGO = ventasFilterPreset?.catalogs?.TIPO_PAGO ?? tipoPagoOpts ?? [];
    const INMOBILIARIAS = ventasFilterPreset?.catalogs?.INMOBILIARIAS ?? inmobiliariasOpts ?? [];

    return {
      estado: ESTADOS,
      tipoPago: TIPO_PAGO,
      inmobiliaria: INMOBILIARIAS,
    };
  }, [tipoPagoOpts, inmobiliariasOpts]);

  // ===== Rangos =====
  const ranges = useMemo(() => ({
    fechaVenta: ventasFilterPreset?.ranges?.fechaVenta,
    monto: ventasFilterPreset?.ranges?.monto,
    // plazoEscritura: ventasFilterPreset?.ranges?.plazoEscritura,
  }), []);

  const defaults = useMemo(() => ({
    q: "",
    estado: [],
    tipoPago: [],
    inmobiliaria: [],
    fechaVenta: { min: null, max: null },
    monto: { min: null, max: null },
    // plazoEscritura: { min: null, max: null },
  }), []);

  const viewsConfig = useMemo(() => ({
    isInmo: false,
    sanitizeForRole: (filters) => filters,
  }), []);

  // Formateo de opciones (si querés “bonito” en chips)
  const optionFormatter = useMemo(() => ({
    estado: nice,
    tipoPago: nice,
    inmobiliaria: (val) => val, // si tus opciones ya vienen con label correcto
  }), []);

  // ========= Mapeos de shape =========
// FilterBarBase -> shape que espera applyVentaFilters
const toPageShape = (p) => ({
  // OJO: acá NO usamos "texto/estados/inmobiliarias/...".
  // Conservamos exactamente los ids de fields: q, estado, tipoPago, inmobiliaria, fechaVenta, monto.
  // q puede no usarse; applyVentaFilters ya busca por id/lotId/monto internamente si lo necesitás.
  estado: Array.isArray(p?.estado) ? p.estado : [],
  tipoPago: Array.isArray(p?.tipoPago) ? p.tipoPago : [],
  inmobiliaria: Array.isArray(p?.inmobiliaria) ? p.inmobiliaria : [],

  // Normalizamos a números (timestamps) si vinieran como string/Date
  fechaVenta: {
    min: p?.fechaVenta?.min != null ? +p.fechaVenta.min : null,
    max: p?.fechaVenta?.max != null ? +p.fechaVenta.max : null,
  },

  monto: {
    min: p?.monto?.min != null ? +p.monto.min : null,
    max: p?.monto?.max != null ? +p.monto.max : null,
  },

  // Si más adelante habilitás el plazo:
  // plazoEscritura: {
  //   min: p?.plazoEscritura?.min != null ? +p.plazoEscritura.min : null,
  //   max: p?.plazoEscritura?.max != null ? +p.plazoEscritura.max : null,
  // },
});

// (Opcional) hidratar desde un value externo con ese mismo shape
const fromPageShape = (v = {}) => ({
  q: v.q ?? "",
  estado: v.estado ?? [],
  tipoPago: v.tipoPago ?? [],
  inmobiliaria: v.inmobiliaria ?? [],
  fechaVenta: {
    min: v?.fechaVenta?.min ?? null,
    max: v?.fechaVenta?.max ?? null,
  },
  monto: {
    min: v?.monto?.min ?? null,
    max: v?.monto?.max ?? null,
  },
  // plazoEscritura: {
  //   min: v?.plazoEscritura?.min ?? null,
  //   max: v?.plazoEscritura?.max ?? null,
  // },
});


  const handleParamsChange = (paramsFromFB) => {
    if (typeof onChange === "function") {
      onChange(toPageShape(paramsFromFB));
    }
  };

  return (
    <FilterBarBase
      // configuración
      fields={fields}
      catalogs={catalogs}
      ranges={ranges}
      defaults={defaults}
      viewsConfig={viewsConfig}
      variant={variant}
      chipsFormatter={ventasChipsFrom}
      optionFormatter={optionFormatter}

      // estado / métricas
      isLoading={isLoading}
      total={total}
      filtrados={filtrados}
      onClear={onClear}

      // emitir cambios hacia la página
      onParamsChange={handleParamsChange}

      // hidratar estado inicial si tu FilterBarBase lo soporta:
      initialValue={fromPageShape(value)}
    />
  );
}
