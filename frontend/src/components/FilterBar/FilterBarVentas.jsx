// components/FilterBar/FilterBarVentas.jsx
// Propósito: emitir filtros en formato NUEVO y LEGACY a la vez,
// y normalizar ESTADO a MAYÚSCULAS para que siempre coincida.

import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { ventasFilterPreset } from "./presets/ventas.preset";
import { ventasChipsFrom, nice } from "./utils/ventasChips";

export default function FilterBarVentas({
  value,
  onChange,
  isLoading,
  total,
  filtrados,
  onClear,
  tipoPagoOpts,
  inmobiliariasOpts,
  variant = "dashboard",
  userRole = "GENERAL",
}) {
  // ===== Definición de campos que maneja FilterBarBase =====
  const fields = useMemo(
    () => [
      { id: "q",              type: "search",      label: "Búsqueda",       placeholder: "ID, lote, monto...", defaultValue: "" },
      { id: "estado",         type: "multiSelect", label: "Estado",         defaultValue: [] },
      { id: "tipoPago",       type: "multiSelect", label: "Tipo de Pago",   defaultValue: [] },
      { id: "inmobiliarias",  type: "multiSelect", label: "Inmobiliaria",   defaultValue: [] },
      { id: "fechaVenta",     type: "dateRange",   label: "Fecha de Venta", defaultValue: { min: null, max: null } },
      { id: "monto",          type: "range",       label: "Monto",          defaultValue: { min: null, max: null } },
    ],
    []
  );

  // ===== Catálogos =====
  const catalogs = useMemo(() => {
    const norm = (arr) =>
      (arr ?? []).map((o) =>
        typeof o === "string"
          ? { value: o, label: o }
          : {
              value: o.value ?? o.id ?? o.label ?? String(o),
              label: o.label ?? o.name ?? String(o.value ?? o.id ?? o),
            }
      );

    const ESTADOS = norm(ventasFilterPreset?.catalogs?.ESTADOS ?? []);
    const TIPO_PAGO = norm(ventasFilterPreset?.catalogs?.TIPO_PAGO ?? tipoPagoOpts ?? []);
    const INM_PRESET = norm(ventasFilterPreset?.catalogs?.INMOBILIARIAS ?? inmobiliariasOpts ?? []);

    // Garantizar "La Federala"
    const hasLF = INM_PRESET.some((o) => (o.value ?? o.label) === "La Federala");
    const INMOBILIARIAS = hasLF ? INM_PRESET : [{ value: "La Federala", label: "La Federala" }, ...INM_PRESET];

    return {
      estado: ESTADOS,
      tipoPago: TIPO_PAGO,
      inmobiliarias: INMOBILIARIAS,
    };
  }, [tipoPagoOpts, inmobiliariasOpts]);

  const ranges = useMemo(
    () => ({
      fechaVenta: ventasFilterPreset?.ranges?.fechaVenta,
      monto: ventasFilterPreset?.ranges?.monto,
    }),
    []
  );

  const defaults = useMemo(
    () => ({
      q: "",
      estado: [],
      tipoPago: [],
      inmobiliarias: [],
      fechaVenta: { min: null, max: null },
      monto: { min: null, max: null },
    }),
    []
  );

  const viewsConfig = useMemo(
    () => ({
      isInmo: false,
      sanitizeForRole: (filters) => filters,
    }),
    []
  );

  const optionFormatter = useMemo(
    () => ({
      estado: nice,
      tipoPago: nice,
      inmobiliarias: nice,
    }),
    []
  );

  // ===== Mapeos NUEVO <-> LEGACY + Normalización de valores =====
  const toUpperArray = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .map((v) => (typeof v === "string" ? v.toUpperCase() : v))
      .filter(Boolean);

  const toPageShape = (p) => {
    // Normalizamos a MAYÚSCULAS porque la data de ventas suele estar en UPPERCASE
    const estado = toUpperArray(p?.estado);
    const tipoPago = toUpperArray(p?.tipoPago);
    // Inmobiliarias se mantiene como texto (no uppercasing)
    const inmobiliarias = Array.isArray(p?.inmobiliarias) ? p.inmobiliarias : [];

    const fvMin = p?.fechaVenta?.min != null ? +p.fechaVenta.min : null;
    const fvMax = p?.fechaVenta?.max != null ? +p.fechaVenta.max : null;
    const mMin = p?.monto?.min != null ? +p.monto.min : null;
    const mMax = p?.monto?.max != null ? +p.monto.max : null;

    // Emitimos NUEVO + LEGACY (para compatibilidad con el módulo que filtra)
    return {
      // NUEVO
      estado,
      tipoPago,
      inmobiliarias,
      fechaVenta: { min: fvMin, max: fvMax },
      monto: { min: mMin, max: mMax },

      // LEGACY (claves que algunos módulos leen hoy)
      estados: estado,             // plural
      estadoVenta: estado,         // alias usado en algunos lados
      inmobiliaria: inmobiliarias, // singular
      fechaVentaMin: fvMin,
      fechaVentaMax: fvMax,
      montoMin: mMin,
      montoMax: mMax,
    };
  };

  const fromPageShape = (v = {}) => ({
    q: v.q ?? "",
    estado: v.estado ?? v.estados ?? v.estadoVenta ?? [],
    tipoPago: v.tipoPago ?? [],
    inmobiliarias: v.inmobiliarias ?? v.inmobiliaria ?? [],
    fechaVenta: {
      min: v?.fechaVenta?.min ?? v?.fechaVentaMin ?? null,
      max: v?.fechaVenta?.max ?? v?.fechaVentaMax ?? null,
    },
    monto: {
      min: v?.monto?.min ?? v?.montoMin ?? null,
      max: v?.monto?.max ?? v?.montoMax ?? null,
    },
  });

  const handleParamsChange = (paramsFromFB) => {
    onChange?.(toPageShape(paramsFromFB));
  };

  return (
    <FilterBarBase
      fields={fields}
      catalogs={catalogs}
      ranges={ranges}
      defaults={defaults}
      viewsConfig={viewsConfig}
      variant={variant}
      chipsFormatter={ventasChipsFrom}
      optionFormatter={optionFormatter}
      isLoading={isLoading}
      total={total}
      filtrados={filtrados}
      onClear={onClear}
      onParamsChange={handleParamsChange}
      initialValue={fromPageShape(value)}
    />
  );
}
