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
  onSearchChange, // Callback opcional para búsqueda (manejo separado)
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
      { id: "q",              type: "search",      label: "Búsqueda",       placeholder: "ID, lote, cliente...", defaultValue: "" },
      { id: "estado",         type: "multiSelect", label: "Estado",         defaultValue: [] },
      { id: "visibilidad",    type: "singleSelect",label: "Visibilidad",   defaultValue: "OPERATIVO" },
      { id: "tipoPago",       type: "multiSelect", label: "Tipo de Pago",   defaultValue: [] },
      { id: "inmobiliarias",  type: "multiSelect", label: "Inmobiliaria",   defaultValue: [] },
      { id: "fechaVenta",     type: "dateRange",   label: "Fecha de Venta", defaultValue: { min: null, max: null } },
      { id: "plazoEscritura", type: "dateRange",   label: "Fecha Escritura Programada", defaultValue: { min: null, max: null } }, // Etapa 3
      { id: "monto",          type: "range",       label: "Monto",          defaultValue: { min: null, max: null } },
    ],
    []
  );

  // ===== Catálogos =====
  const catalogs = useMemo(() => {
    const normOptions = (arr) =>
      (arr ?? []).map((o) => {
        // Soporta backends distintos
        if (typeof o === "string") return { value: o, label: o };
        if (typeof o === "number") return { value: o, label: String(o) };
        // nombres comunes que solemos tener
        const id = o.value ?? o.id ?? o.key ?? o.codigo ?? o.code ?? null;
        const label = o.label ?? o.nombre ?? o.name ?? o.descripcion ?? o.desc ?? o.title ?? String(id ?? "");
        return { value: id ?? label, label };
      });

    // ESTADOS: Filtrar OPERATIVO y ELIMINADO del catálogo de estados (son de estadoOperativo, no de estado de negocio)
    const estadosRaw = normOptions(ventasFilterPreset?.catalogs?.ESTADOS ?? []);
    const ESTADOS = estadosRaw.filter(opt => {
      const value = opt.value ?? opt.label ?? opt;
      const valueStr = String(value).toUpperCase().trim();
      return valueStr !== "OPERATIVO" && valueStr !== "ELIMINADO";
    });

    // VISIBILIDAD (estadoOperativo)
    const VISIBILIDAD_OPTIONS = [
      { value: "OPERATIVO", label: "Operativas" },
      { value: "ELIMINADO", label: "Eliminadas" },
    ];

    const TIPO_PAGO = normOptions(ventasFilterPreset?.catalogs?.TIPO_PAGO ?? tipoPagoOpts ?? []);
    
    // INM: priorizamos lo que venga del container, luego preset. Normalizamos a { value: ID, label: nombre }
    const INM_FROM_PROPS = normOptions(inmobiliariasOpts);
    const INM_FROM_PRESET = normOptions(ventasFilterPreset?.catalogs?.INMOBILIARIAS ?? []);
    const INM = INM_FROM_PROPS.length ? INM_FROM_PROPS : INM_FROM_PRESET;

    // Garantizamos "La Federala" si no está (label), sin romper IDs
    const hasLF = INM.some((o) => (o.label ?? "").toLowerCase().includes("la federala"));
    const INMOBILIARIAS = hasLF ? INM : [{ value: "La Federala", label: "La Federala" }, ...INM];

    return {
      estado: ESTADOS,
      visibilidad: VISIBILIDAD_OPTIONS,
      tipoPago: TIPO_PAGO,
      inmobiliarias: INMOBILIARIAS,
    };
  }, [tipoPagoOpts, inmobiliariasOpts]);

  const ranges = useMemo(
    () => ({
      fechaVenta: ventasFilterPreset?.ranges?.fechaVenta,
      plazoEscritura: ventasFilterPreset?.ranges?.plazoEscritura, // Etapa 3
      monto: ventasFilterPreset?.ranges?.monto,
    }),
    []
  );

  const defaults = useMemo(
    () => ({
      q: "",
      estado: [],
      visibilidad: "OPERATIVO", // Default: mostrar solo operativas
      tipoPago: [],
      inmobiliarias: [],
      fechaVenta: { min: null, max: null },
      plazoEscritura: { min: null, max: null }, // Etapa 3
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
      visibilidad: (val) => {
        if (val === "OPERATIVO") return "Operativas";
        if (val === "ELIMINADO") return "Eliminadas";
        return val;
      },
      tipoPago: nice,
      // inmobiliarias: NO usar 'nice' porque toma el value (ID) en lugar del label (nombre)
      // Dejar que FilterBarBase use el label directamente de las opciones
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

    // VISIBILIDAD (estadoOperativo)
    const visibilidad = p?.visibilidad ?? "OPERATIVO"; // Default OPERATIVO

    const fvMin = p?.fechaVenta?.min != null ? +p.fechaVenta.min : null;
    const fvMax = p?.fechaVenta?.max != null ? +p.fechaVenta.max : null;
    const mMin = p?.monto?.min != null ? +p.monto.min : null;
    const mMax = p?.monto?.max != null ? +p.monto.max : null;

    // Emitimos NUEVO + LEGACY (para compatibilidad con el módulo que filtra)
    return {
      // NUEVO
      estado,
      estadoOperativo: visibilidad, // Mapear visibilidad a estadoOperativo para backend
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
    visibilidad: v.estadoOperativo ?? v.visibilidad ?? "OPERATIVO", // Mapear desde estadoOperativo o visibilidad
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
    // Excluir 'q' del procesamiento (se maneja con onSearchChange)
    const { q, ...paramsSinQ } = paramsFromFB || {};
    
    // Si paramsFromFB solo tiene algunos campos (actualización parcial), 
    // no convertir con toPageShape porque agrega todos los campos con defaults
    const isPartialUpdate = paramsSinQ && (
      Object.keys(paramsSinQ).length < 3 && !paramsSinQ.inmobiliarias
    );
    
    if (isPartialUpdate) {
      // Si viene visibilidad, mapearla a estadoOperativo para el onChange
      if (paramsSinQ.visibilidad !== undefined) {
        onChange?.({ estadoOperativo: paramsSinQ.visibilidad });
      } else {
        // Para otros campos parciales, usar toPageShape para mapear correctamente
        onChange?.(toPageShape(paramsSinQ));
      }
    } else {
      onChange?.(toPageShape(paramsSinQ));
    }
  };

  // Memoizar initialValue para que el useEffect en FilterBarBase detecte cambios correctamente
  // Depender específicamente de estadoOperativo para detectar cambios en visibilidad
  const initialValueMemo = useMemo(() => fromPageShape(value), [
    value?.estadoOperativo, 
    value?.visibilidad, 
    JSON.stringify(value?.estado || []), 
    JSON.stringify(value?.tipoPago || []), 
    JSON.stringify(value?.inmobiliarias || []), 
    value?.fechaVenta?.min, 
    value?.fechaVenta?.max, 
    value?.monto?.min, 
    value?.monto?.max
  ]);

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
      onSearchChange={onSearchChange}
      initialValue={initialValueMemo}
    />
  );
}
