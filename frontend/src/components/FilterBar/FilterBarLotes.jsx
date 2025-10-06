// components/FilterBar/FilterBarLotes.jsx
// Wrapper específico para lotes que usa FilterBarBase genérico

import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { lotesFilterPreset } from "./presets/lotes.preset";
import { filterEstadoOptionsFor, canUseDeudorFilter } from "../../lib/auth/rbac.ui";
import { sanitizeFiltersForRole } from "./utils/role";

export default function FilterBarLotes({
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
}) {
  const authUser = useMemo(() => ({ role: String(userRole).toUpperCase() }), [userRole]);
  const canDeudor = canUseDeudorFilter(authUser);
  const isInmo = !canDeudor;

  // Configuración de campos para lotes
  const fields = useMemo(() => [
    {
      id: 'q',
      type: 'search',
      label: 'Búsqueda',
      placeholder: 'ID, propietario o calle...',
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
      label: 'Sub-estado',
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
    ...(isInmo ? [] : [{
      id: 'deudor',
      type: 'singleSelect',
      label: 'Deudor',
      options: ['Sí', 'No'],
      defaultValue: null
    }])
  ], [isInmo]);

  // Catálogos filtrados por RBAC
  const catalogs = useMemo(() => {
    const ALL_ESTADOS = lotesFilterPreset.catalogs.ESTADOS;
    const ESTADOS = filterEstadoOptionsFor(authUser, ALL_ESTADOS);
    
    return {
      estado: ESTADOS,
      subestado: lotesFilterPreset.catalogs.SUBESTADOS,
      calle: lotesFilterPreset.catalogs.CALLES,
    };
  }, [authUser]);

  // Configuración de rangos
  const ranges = useMemo(() => lotesFilterPreset.ranges, []);

  // Valores por defecto
  const defaults = useMemo(() => lotesFilterPreset.defaults, []);

  // Configuración de vistas
  const viewsConfig = useMemo(() => ({
    isInmo,
    sanitizeForRole: (filters) => sanitizeFiltersForRole(filters, isInmo)
  }), [isInmo]);

  return (
    <FilterBarBase
      fields={fields}
      catalogs={catalogs}
      ranges={ranges}
      defaults={defaults}
      viewsConfig={viewsConfig}
      variant={variant}
      onParamsChange={onParamsChange}
    />
  );
}
