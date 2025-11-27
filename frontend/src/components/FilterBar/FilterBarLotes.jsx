// components/FilterBar/FilterBarLotes.jsx
// Wrapper específico para lotes que usa FilterBarBase genérico

import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { lotesFilterPreset } from "./presets/lotes.preset";
import { chipsFrom, nice } from "./utils/chips";
import { filterEstadoOptionsFor, canUseDeudorFilter } from "../../lib/auth/rbac.ui";

export default function FilterBarLotes({
  preset = lotesFilterPreset,
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
}) {
  const authUser = useMemo(() => ({ role: String(userRole).toUpperCase() }), [userRole]);
  // Catálogos desde preset, filtrados por RBAC
  const ALL_ESTADOS = useMemo(
    () => preset?.catalogs?.ESTADOS ?? ["DISPONIBLE", "NO_DISPONIBLE", "RESERVADO", "VENDIDO", "ALQUILADO", "EN_PROMOCION"],
    [preset]
  );
  const ESTADOS = useMemo(
    () => filterEstadoOptionsFor(authUser, ALL_ESTADOS),
    [authUser, ALL_ESTADOS]
  );

  const canDeudor = canUseDeudorFilter(authUser);
  const isInmo = !canDeudor;

  const SUBESTADOS = useMemo(
    () => preset?.catalogs?.SUBESTADOS ?? ["CONSTRUIDO", "EN_CONSTRUCCION", "NO_CONSTRUIDO"],
    [preset]
  );
  const CALLES = useMemo(() => preset?.catalogs?.CALLES ?? [
    "REINAMORA", "MACA", "ZORZAL", "CAUQUEN", "ALONDRA", "JACANA", "TACUARITO", 
    "JILGUERO", "GOLONDRINA", "CALANDRIA", "AGUILAMORA", "LORCA", "MILANO"
  ], [preset]);

  // Configuración de campos para lotes
  const fields = useMemo(() => [
    {
      id: 'q',
      type: 'search',
      label: 'Búsqueda',
      placeholder: 'ID, calle, precio...',
      defaultValue: ''
    },
    {
      id: 'estado',
      type: 'multiSelect',
      label: 'Estado',
      defaultValue: []
    },
    {
      id: 'subestado',
      type: 'multiSelect',
      label: 'Subestado',
      defaultValue: []
    },
    {
      id: 'calle',
      type: 'multiSelect',
      label: 'Calle',
      defaultValue: [],
      useGrid: true
    },
    {
      id: 'frente',
      type: 'range',
      label: 'Frente',
      defaultValue: { min: null, max: null }
    },
    {
      id: 'fondo',
      type: 'range',
      label: 'Fondo',
      defaultValue: { min: null, max: null }
    },
    {
      id: 'sup',
      type: 'range',
      label: 'Superficie',
      defaultValue: { min: null, max: null }
    },
    {
      id: 'precio',
      type: 'range',
      label: 'Precio',
      defaultValue: { min: null, max: null }
    },
    ...(canDeudor ? [{
      id: 'deudor',
      type: 'singleSelect',
      label: 'Deudor',
      defaultValue: null
    }] : [])
  ], [canDeudor]);

  // Catálogos para lotes (filtrados por RBAC)
  const catalogs = useMemo(() => ({
    estado: ESTADOS,
    subestado: SUBESTADOS,
    calle: CALLES,
    ...(canDeudor ? { deudor: [true, false] } : {})
  }), [ESTADOS, SUBESTADOS, CALLES, canDeudor]);

  // Configuración de rangos para lotes
  const ranges = useMemo(() => ({
    frente: preset?.ranges?.frente ?? { minLimit: 0, maxLimit: 100, step: 0.1, unit: "m" },
    fondo: preset?.ranges?.fondo ?? { minLimit: 0, maxLimit: 100, step: 0.1, unit: "m" },
    sup: preset?.ranges?.sup ?? { minLimit: 0, maxLimit: 5000, step: 1, unit: "m²" },
    precio: preset?.ranges?.precio ?? { minLimit: 0, maxLimit: 300000, step: 100, unit: "USD" },
  }), [preset]);

  // Valores por defecto para lotes
  const defaults = useMemo(() => ({
    q: "",
    estado: [],
    subestado: [],
    calle: [],
    frente: { min: null, max: null },
    fondo: { min: null, max: null },
    sup: { min: null, max: null },
    precio: { min: null, max: null },
    ...(canDeudor ? { deudor: null } : {})
  }), [canDeudor]);

  // Configuración de vistas con RBAC
  const viewsConfig = useMemo(() => ({
    isInmo,
    sanitizeForRole: (filters) => {
      // Aplicar sanitización RBAC
      if (isInmo) {
        return {
          ...filters,
          estado: filters.estado?.filter(v => v !== "NO_DISPONIBLE") || [],
          deudor: null
        };
      }
      return filters;
    }
  }), [isInmo]);

  // Función para formatear opciones en el modal
  const optionFormatter = useMemo(() => ({
    estado: nice,
    subestado: nice,
    calle: nice,
    deudor: (val) => val === true ? "Solo deudor" : val === false ? "Sin deuda" : val
  }), []);

  // Función para formatear chips (usando la existente)
  const chipsFormatter = useMemo(() => (appliedFilters, catalogs) => {
    return chipsFrom(appliedFilters, defaults, isInmo);
  }, [defaults, isInmo]);

  return (
    <FilterBarBase
      fields={fields}
      catalogs={catalogs}
      ranges={ranges}
      defaults={defaults}
      viewsConfig={viewsConfig}
      variant={variant}
      onParamsChange={onParamsChange}
      chipsFormatter={chipsFormatter}
      optionFormatter={optionFormatter}
    />
  );
}