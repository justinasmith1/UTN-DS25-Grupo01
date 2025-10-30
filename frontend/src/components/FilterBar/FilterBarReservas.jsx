// src/components/FilterBar/FilterBarReservas.jsx
import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { reservasFilterPreset } from "./presets/reservas.preset";
import { reservasChipsFrom, nice } from "./utils/reservasChips";

export default function FilterBarReservas({
  value,
  onChange,
  isLoading,
  total,
  filtrados,
  onClear,
  estadosOpts,        // puede venir como ["ACTIVA", ...] o [{id, nombre}, ...]
  inmobiliariasOpts,  // ideal: [{id, nombre}, ...] (lo usamos como en Ventas)
  variant = "dashboard",
  userRole,
}) {
  // ===== Helpers =====
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

  // ===== Campos visibles =====
  const fields = useMemo(
    () => [
      { id: "q",              type: "search",     label: "Buscar",             placeholder: "Cliente, inmobiliaria, lote...", defaultValue: "" },
      { id: "estado",         type: "multiSelect",label: "Estado",             defaultValue: [] },
      { id: "inmobiliarias",  type: "multiSelect",label: "Inmobiliaria",       defaultValue: [] },
      { id: "fechaReserva",   type: "dateRange",  label: "Fecha de Reserva",   defaultValue: { min: null, max: null } },
      { id: "fechaCreacion",  type: "dateRange",  label: "Fecha de Creación",  defaultValue: { min: null, max: null } },
      { id: "seña",           type: "range",      label: "Seña",               defaultValue: { min: null, max: null } },
    ],
    []
  );

  // ===== Catálogos (IDs reales para Inmobiliarias) =====
  const catalogs = useMemo(() => {
    // ESTADOS: aceptamos strings o {id/nombre}
    const ESTADOS = normOptions(estadosOpts ?? reservasFilterPreset?.catalogs?.ESTADOS ?? []);

    // INM: priorizamos lo que venga del container (de Ventas),
    // luego preset. Normalizamos a { value: ID, label: nombre }
    const INM_FROM_PROPS = normOptions(inmobiliariasOpts);
    const INM_FROM_PRESET = normOptions(reservasFilterPreset?.catalogs?.INMOBILIARIAS ?? []);
    const INM = INM_FROM_PROPS.length ? INM_FROM_PROPS : INM_FROM_PRESET;

    // Garantizamos "La Federala" si no está (label), sin romper IDs
    const hasLF = INM.some((o) => (o.label ?? "").toLowerCase().includes("la federala"));
    const INMOBILIARIAS = hasLF ? INM : [{ value: "La Federala", label: "La Federala" }, ...INM];

    return { estado: ESTADOS, inmobiliarias: INMOBILIARIAS };
  }, [estadosOpts, inmobiliariasOpts]);

  // ===== Rangos / Defaults =====
  const ranges = useMemo(
    () => ({
      fechaReserva:  reservasFilterPreset?.ranges?.fechaReserva,
      fechaCreacion: reservasFilterPreset?.ranges?.fechaCreacion,
      seña:          reservasFilterPreset?.ranges?.seña,
    }),
    []
  );

  const defaults = useMemo(
    () => ({
      q: "",
      estado: [],
      inmobiliarias: [],
      fechaReserva:  { min: null, max: null },
      fechaCreacion: { min: null, max: null },
      seña:          { min: null, max: null },
    }),
    []
  );

  const optionFormatter = useMemo(() => ({ estado: nice, inmobiliarias: nice }), []);

  // ===== Mapper NUEVO → LEGACY + IDs + ISO =====
  const toUpperArray = (xs) =>
    Array.isArray(xs) ? xs.map((s) => (typeof s === "string" ? s.toUpperCase() : s)) : [];

  const toISO = (ms) => (ms == null ? null : new Date(ms).toISOString().slice(0, 10)); // YYYY-MM-DD

  const toPageShape = (p) => {
    // ESTADO en mayúsculas
    const estado = toUpperArray(p?.estado);

    // INMOBILIARIAS: enviamos por ID (value). Si value no es numérico, igual lo mandamos
    const inmoValues = Array.isArray(p?.inmobiliarias) ? p.inmobiliarias : [];
    // si vinieran objetos raros, nos quedamos con su "value" o él mismo
    const inmoIds = inmoValues.map((v) => (typeof v === "object" ? v.value ?? v : v));

    // Fechas reserva
    const frMin = p?.fechaReserva?.min ?? null;
    const frMax = p?.fechaReserva?.max ?? null;

    // Fechas creación
    const fcMin = p?.fechaCreacion?.min ?? null;
    const fcMax = p?.fechaCreacion?.max ?? null;

    // Seña
    const sMin = p?.seña?.min ?? null;
    const sMax = p?.seña?.max ?? null;

    return {
      // ===== NUEVO =====
      q: p?.q ?? "",
      estado,                       // ["ACTIVA", ...]
      inmobiliarias: inmoIds,       // IMPORTANTE: por ID
      fechaReserva:  { min: frMin, max: frMax },
      fechaCreacion: { min: fcMin, max: fcMax },
      seña:          { min: sMin,  max: sMax  },

      // ===== LEGACY / BACKEND (alias) =====
      estados: estado,
      // IDs de inmobiliaria explícitos (lo más común en backends)
      inmobiliariaIds: inmoIds,
      // por compatibilidad si el fetch espera "inmobiliaria"
      inmobiliaria: inmoIds,

      // Reserva (ms + ISO)
      fechaReservaMin: frMin,
      fechaReservaMax: frMax,
      fechaReservaDesde: toISO(frMin),
      fechaReservaHasta: toISO(frMax),

      // Creación (ms + ISO + nombres comunes)
      fechaCreacionMin: fcMin,
      fechaCreacionMax: fcMax,
      createdAtMin: fcMin,
      createdAtMax: fcMax,
      createdAtDesde: toISO(fcMin),
      createdAtHasta: toISO(fcMax),

      // Seña (sin ñ)
      seniaMin: sMin,
      seniaMax: sMax,
    };
  };

  // Restaurar vistas guardadas (acepta alias también)
  const fromPageShape = (v = {}) => {
    const pick = (a, b) => (a != null ? a : b);
    return {
      q: v.q ?? "",
      estado: v.estado ?? v.estados ?? [],
      // aceptamos ids o labels
      inmobiliarias: v.inmobiliarias ?? v.inmobiliaria ?? v.inmobiliariaIds ?? [],
      fechaReserva: {
        min: pick(v?.fechaReserva?.min, v?.fechaReservaMin) ?? null,
        max: pick(v?.fechaReserva?.max, v?.fechaReservaMax) ?? null,
      },
      fechaCreacion: {
        min: pick(v?.fechaCreacion?.min, v?.fechaCreacionMin ?? v?.createdAtMin) ?? null,
        max: pick(v?.fechaCreacion?.max, v?.fechaCreacionMax ?? v?.createdAtMax) ?? null,
      },
      seña: {
        min: pick(v?.seña?.min, v?.seniaMin) ?? null,
        max: pick(v?.seña?.max, v?.seniaMax) ?? null,
      },
    };
  };

  const handleParamsChange = (paramsFromFB) => onChange?.(toPageShape(paramsFromFB));

  const viewsConfig = useMemo(
    () => ({ isInmo: false, sanitizeForRole: (filters) => filters }),
    []
  );

  return (
    <FilterBarBase
      fields={fields}
      catalogs={catalogs}
      ranges={ranges}
      defaults={defaults}
      viewsConfig={viewsConfig}
      variant={variant}
      userRole={userRole}
      chipsFormatter={reservasChipsFrom}
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
