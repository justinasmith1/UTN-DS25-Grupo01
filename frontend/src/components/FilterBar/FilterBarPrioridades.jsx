// src/components/FilterBar/FilterBarPrioridades.jsx
import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { prioridadesFilterPreset } from "./presets/prioridades.preset";
import { prioridadesChipsFrom, nice } from "./utils/prioridadesChips";

export default function FilterBarPrioridades({
  value,
  onChange,
  onSearchChange, // Callback opcional para búsqueda (manejo separado)
  isLoading,
  total,
  filtrados,
  onClear,
  estadosOpts,        // puede venir como ["ACTIVA", ...] o [{id, nombre}, ...]
  inmobiliariasOpts,  // [{id, nombre}, ...] para chips dinámicos
  variant = "dashboard",
  userRole,
}) {
  // ===== Helpers =====
  const normOptions = (arr) =>
    (arr ?? []).map((o) => {
      if (typeof o === "string") return { value: o, label: o };
      if (typeof o === "number") return { value: o, label: String(o) };
      const id = o.value ?? o.id ?? o.key ?? o.codigo ?? o.code ?? null;
      const label = o.label ?? o.nombre ?? o.name ?? o.descripcion ?? o.desc ?? o.title ?? String(id ?? "");
      return { value: id ?? label, label };
    });

  // ===== Campos visibles =====
  const fields = useMemo(() => {
    const allFields = [
      { id: "q", type: "search", label: "Búsqueda", placeholder: "N° prioridad, lote, inmobiliaria...", defaultValue: "" },
      { id: "estado", type: "multiSelect", label: "Estado", defaultValue: [] },
      { id: "owner", type: "multiSelect", label: "Inmobiliaria", defaultValue: [] },
      { id: "fechaFin", type: "dateRange", label: "Vencimiento", defaultValue: { min: null, max: null } },
    ];
    // Filtrar el campo de inmobiliaria si el usuario es INMOBILIARIA
    if (userRole === 'INMOBILIARIA') {
      return allFields.filter(f => f.id !== 'owner');
    }
    return allFields;
  }, [userRole]);

  // ===== Catálogos =====
  const catalogs = useMemo(() => {
    // ESTADOS
    const ESTADOS = normOptions(estadosOpts ?? prioridadesFilterPreset?.catalogs?.ESTADOS ?? []);

    // OWNER: "La Federala" + inmobiliarias dinámicas
    const INM_FROM_PROPS = normOptions(inmobiliariasOpts);
    const hasLF = INM_FROM_PROPS.some((o) => (o.label ?? "").toLowerCase().includes("la federala"));
    const OWNER_OPTIONS = hasLF 
      ? INM_FROM_PROPS 
      : [{ value: "La Federala", label: "La Federala" }, ...INM_FROM_PROPS];

    return { estado: ESTADOS, owner: OWNER_OPTIONS };
  }, [estadosOpts, inmobiliariasOpts]);

  // ===== Rangos / Defaults =====
  const ranges = useMemo(
    () => ({
      fechaFin: prioridadesFilterPreset?.ranges?.fechaFin,
    }),
    []
  );

  const defaults = useMemo(
    () => {
      const baseDefaults = {
        q: "",
        estado: [],
        fechaFin: { min: null, max: null },
      };
      // Para INMOBILIARIA: no incluir owner en defaults
      if (userRole !== 'INMOBILIARIA') {
        return { ...baseDefaults, owner: [] };
      }
      return baseDefaults;
    },
    [userRole]
  );

  const optionFormatter = useMemo(() => ({
    estado: nice,
    // owner no necesita formateador porque FilterBarBase ya usa optionLabel directamente
  }), []);

  // ===== Mapper NUEVO → LEGACY + IDs =====
  const toUpperArray = (xs) =>
    Array.isArray(xs) ? xs.map((s) => (typeof s === "string" ? s.toUpperCase() : s)) : [];

  const toISO = (ms) => (ms == null ? null : new Date(ms).toISOString().slice(0, 10)); // YYYY-MM-DD

  const toPageShape = (p) => {
    const estado = toUpperArray(p?.estado);

    // OWNER: puede venir como "La Federala" (string) o IDs de inmobiliarias
    const ownerValues = Array.isArray(p?.owner) ? p.owner : [];
    const ownerIds = ownerValues.map((v) => {
      if (typeof v === "object") return v.value ?? v;
      // Si es "La Federala", mantener como string
      if (typeof v === "string" && v.toLowerCase().includes("federala")) return "La Federala";
      return v;
    });

    // Fecha de vencimiento (fechaFin)
    const ffMin = p?.fechaFin?.min ?? null;
    const ffMax = p?.fechaFin?.max ?? null;

    return {
      q: p?.q ?? "",
      estado,
      owner: ownerIds,
      fechaFin: { min: ffMin, max: ffMax },
      
      // Legacy/Backend aliases
      fechaFinDesde: toISO(ffMin),
      fechaFinHasta: toISO(ffMax),
    };
  };

  // Restaurar vistas guardadas
  const fromPageShape = (v = {}) => {
    const pick = (a, b) => (a != null ? a : b);
    return {
      q: v.q ?? "",
      estado: v.estado ?? [],
      owner: v.owner ?? [],
      fechaFin: {
        min: pick(v?.fechaFin?.min, v?.fechaFinDesde) ?? null,
        max: pick(v?.fechaFin?.max, v?.fechaFinHasta) ?? null,
      },
    };
  };

  const handleParamsChange = (paramsFromFB) => {
    // Excluir 'q' del procesamiento (se maneja con onSearchChange)
    const { q, ...paramsSinQ } = paramsFromFB || {};
    
    const isPartialUpdate = paramsSinQ && Object.keys(paramsSinQ).length < 2;
    
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
      chipsFormatter={prioridadesChipsFrom}
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
