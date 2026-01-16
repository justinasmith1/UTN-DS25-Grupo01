// src/components/FilterBar/FilterBarReservas.jsx
import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { reservasFilterPreset } from "./presets/reservas.preset";
import { reservasChipsFrom, nice } from "./utils/reservasChips";

export default function FilterBarReservas({
  value,
  onChange,
  onSearchChange, // Callback opcional para búsqueda (manejo separado)
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
  // Para INMOBILIARIA: ocultar el filtro de inmobiliaria (solo ven sus propias reservas)
  const fields = useMemo(
    () => {
      const allFields = [
      { id: "q",              type: "search",     label: "Búsqueda",             placeholder: "N° reserva, cliente, lote...", defaultValue: "" },
      { id: "estado",         type: "multiSelect",label: "Estado",             defaultValue: [] },
      { id: "inmobiliarias",  type: "multiSelect",label: "Inmobiliaria",       defaultValue: [] },
      { id: "fechaReserva",   type: "dateRange",  label: "Fecha de Reserva",   defaultValue: { min: null, max: null } },
      { id: "fechaFinReserva",  type: "dateRange",  label: "Plazo Reserva",  defaultValue: { min: null, max: null } },
      { id: "seña",           type: "range",      label: "Seña",               defaultValue: { min: null, max: null } },
      ];
      // Filtrar el campo de inmobiliaria si el usuario es INMOBILIARIA
      if (userRole === 'INMOBILIARIA') {
        return allFields.filter(f => f.id !== 'inmobiliarias');
      }
      return allFields;
    },
    [userRole]
  );

  // ===== Catálogos (IDs reales para Inmobiliarias) =====
  const catalogs = useMemo(() => {
    // ESTADOS: aceptamos strings o {id/nombre}
    const ESTADOS = normOptions(estadosOpts ?? reservasFilterPreset?.catalogs?.ESTADOS ?? []);

    // Para INMOBILIARIA: no incluir catálogo de inmobiliarias (no pueden filtrar por inmobiliaria)
    if (userRole === 'INMOBILIARIA') {
      return { estado: ESTADOS };
    }

    // INM: priorizamos lo que venga del container (de Ventas),
    // luego preset. Normalizamos a { value: ID, label: nombre }
    const INM_FROM_PROPS = normOptions(inmobiliariasOpts);
    const INM_FROM_PRESET = normOptions(reservasFilterPreset?.catalogs?.INMOBILIARIAS ?? []);
    const INM = INM_FROM_PROPS.length ? INM_FROM_PROPS : INM_FROM_PRESET;

    // Garantizamos "La Federala" si no está (label), sin romper IDs
    const hasLF = INM.some((o) => (o.label ?? "").toLowerCase().includes("la federala"));
    const INMOBILIARIAS = hasLF ? INM : [{ value: "La Federala", label: "La Federala" }, ...INM];

    return { estado: ESTADOS, inmobiliarias: INMOBILIARIAS };
  }, [estadosOpts, inmobiliariasOpts, userRole]);

  // ===== Rangos / Defaults =====
  const ranges = useMemo(
    () => ({
      fechaReserva:  reservasFilterPreset?.ranges?.fechaReserva,
      fechaFinReserva: reservasFilterPreset?.ranges?.fechaFinReserva,
      seña:          reservasFilterPreset?.ranges?.seña,
    }),
    []
  );

  const defaults = useMemo(
    () => {
      const baseDefaults = {
      q: "",
      estado: [],
      fechaReserva:  { min: null, max: null },
      fechaFinReserva: { min: null, max: null },
      seña:          { min: null, max: null },
      };
      // Para INMOBILIARIA: no incluir inmobiliarias en defaults
      if (userRole !== 'INMOBILIARIA') {
        return { ...baseDefaults, inmobiliarias: [] };
      }
      return baseDefaults;
    },
    [userRole]
  );

  const optionFormatter = useMemo(() => {
    const base = { estado: nice };
    // Para INMOBILIARIA: no incluir inmobiliarias en optionFormatter
    if (userRole !== 'INMOBILIARIA') {
      return { ...base, inmobiliarias: nice };
    }
    return base;
  }, [userRole]);

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

    // Fechas Plazo reserva
    const ffrMin = p?.fechaFinReserva?.min ?? null;
    const ffrMax = p?.fechaFinReserva?.max ?? null;

    // Seña
    const sMin = p?.seña?.min ?? null;
    const sMax = p?.seña?.max ?? null;

    return {
      // ===== NUEVO =====
      q: p?.q ?? "",
      estado,                       // ["ACTIVA", ...]
      inmobiliarias: inmoIds,       // IMPORTANTE: por ID
      fechaReserva:  { min: frMin, max: frMax },
      fechaFinReserva: { min: ffrMin, max: ffrMax },
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

      fechaFinReservaDesde: toISO(ffrMin),
      fechaFinReservaHasta: toISO(ffrMax),

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
      fechaFinReserva: {
        min: pick(v?.fechaFinReserva?.min, v?.fechaFinReservaDesde) ?? null,
        max: pick(v?.fechaFinReserva?.max, v?.fechaFinReservaHasta) ?? null,
      },
      seña: {
        min: pick(v?.seña?.min, v?.seniaMin) ?? null,
        max: pick(v?.seña?.max, v?.seniaMax) ?? null,
      },
    };
  };

  const handleParamsChange = (paramsFromFB) => {
    // Excluir 'q' del procesamiento (se maneja con onSearchChange)
    const { q, ...paramsSinQ } = paramsFromFB || {};
    
    // Si paramsFromFB solo tiene algunos campos (actualización parcial), 
    // no convertir con toPageShape porque agrega todos los campos con defaults
    const isPartialUpdate = paramsSinQ && (
      Object.keys(paramsSinQ).length < 3 && !paramsSinQ.inmobiliarias
    );
    
    if (isPartialUpdate) {
      onChange?.(paramsSinQ);
    } else {
      onChange?.(toPageShape(paramsSinQ));
    }
  };

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
      onSearchChange={onSearchChange}
      initialValue={fromPageShape(value)}
    />
  );
}
