// src/components/FilterBar/FilterBarInmobiliarias.jsx
// Wrapper del FilterBar para inmobiliarias

import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { inmobiliariasFilterPreset } from "./presets/inmobiliarias.preset";
import { inmobiliariasChipsFrom, nice } from "./utils/inmobiliariasChips";

export default function FilterBarInmobiliarias({
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
  onSearchChange, // Callback opcional para búsqueda (manejo separado)
}) {
  // Configuración de campos para inmobiliarias (siguiendo patrón de FilterBarVentas)
  const fields = useMemo(() => [
    {
      id: 'q',
      type: 'search',
      label: 'Búsqueda',
      placeholder: 'Nombre o razón social...',
      defaultValue: ''
    },
    {
      id: 'estado',
      type: 'multiSelect', // Siguiendo patrón de ventas/reservas
      label: 'Estado',
      defaultValue: []
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

  // Catálogos para el filtro de estado
  const catalogs = useMemo(() => ({
    estado: [
      { value: 'OPERATIVO', label: 'Operativo' },
      { value: 'ELIMINADO', label: 'Eliminado' },
    ]
  }), []);

  // Rangos para los filtros numéricos
  const ranges = useMemo(() => ({
    comxventa: inmobiliariasFilterPreset.ranges.comxventa,
    cantidadVentas: inmobiliariasFilterPreset.ranges.cantidadVentas,
    createdAt: inmobiliariasFilterPreset.ranges.createdAt,
  }), []);

  // Valores por defecto - estado vacío significa mostrar solo OPERATIVAS
  const defaults = useMemo(() => ({
    ...inmobiliariasFilterPreset.defaults,
    estado: [], // Vacío por defecto
  }), []);

  // Configuración de vistas
  const viewsConfig = useMemo(() => ({
    isInmo: false,
    sanitizeForRole: (filters) => filters
  }), []);

  // Formateador de opciones para estado
  const optionFormatter = useMemo(() => ({
    // estado: nice, // Temporalmente comentado para debugging
  }), []);

  return (
    <FilterBarBase
      fields={fields}
      catalogs={catalogs}
      ranges={ranges}
      defaults={defaults}
      viewsConfig={viewsConfig}
      variant={variant}
      onParamsChange={onParamsChange}
      onSearchChange={onSearchChange}
      chipsFormatter={inmobiliariasChipsFrom}
      optionFormatter={optionFormatter}
      userRole={userRole}
    />
  );
}
