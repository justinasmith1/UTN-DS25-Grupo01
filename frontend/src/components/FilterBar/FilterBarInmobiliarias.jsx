// src/components/FilterBar/FilterBarInmobiliarias.jsx
// Wrapper del FilterBar para inmobiliarias

import { useMemo, useCallback } from "react";
import FilterBarBase from "./FilterBarBase";
import { inmobiliariasFilterPreset } from "./presets/inmobiliarias.preset";
import { inmobiliariasChipsFrom, nice } from "./utils/inmobiliariasChips";

export default function FilterBarInmobiliarias({
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
}) {
  // Configuración de campos para inmobiliarias
  const fields = useMemo(() => [
    { 
      id: 'q', 
      type: 'search', 
      label: 'Búsqueda', 
      placeholder: 'ID, nombre, razón social, contacto...', 
      defaultValue: '' 
    },
    { 
      id: 'comxventa', 
      type: 'range', 
      label: 'Comisión x Venta', 
      defaultValue: { min: null, max: null } 
    },
    { 
      id: 'cantidadVentas', 
      type: 'range', 
      label: 'Cantidad de Ventas', 
      defaultValue: { min: null, max: null } 
    },
    { 
      id: 'createdAt', 
      type: 'dateRange', 
      label: 'Fecha de Creación', 
      defaultValue: { min: null, max: null } 
    },
  ], []);

  // Catálogos (vacío - solo usamos búsqueda general)
  const catalogs = useMemo(() => ({}), []);

  // Rangos para los filtros numéricos
  const ranges = useMemo(() => ({
    comxventa: inmobiliariasFilterPreset.ranges.comxventa,
    cantidadVentas: inmobiliariasFilterPreset.ranges.cantidadVentas,
    createdAt: inmobiliariasFilterPreset.ranges.createdAt,
  }), []);

  // Valores por defecto
  const defaults = useMemo(() => inmobiliariasFilterPreset.defaults, []);

  // Configuración de vistas (por ahora sin restricciones específicas)
  const viewsConfig = useMemo(() => ({
    isInmo: false, // No hay restricciones de inmobiliaria en este módulo
    sanitizeForRole: (filters) => filters // Sin sanitización por ahora
  }), []);

  // Formateador de opciones (vacío - no hay filtros de selección múltiple)
  const optionFormatter = useMemo(() => ({}), []);

  return (
    <FilterBarBase
      fields={fields}
      catalogs={catalogs}
      ranges={ranges}
      defaults={defaults}
      viewsConfig={viewsConfig}
      variant={variant}
      onParamsChange={onParamsChange}
      chipsFormatter={inmobiliariasChipsFrom}
      optionFormatter={optionFormatter}
      userRole={userRole}
    />
  );
}
