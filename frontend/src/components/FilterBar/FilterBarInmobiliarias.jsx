// src/components/FilterBar/FilterBarInmobiliarias.jsx
// Wrapper del FilterBar para inmobiliarias
// Sigue el patrón de Visibilidad (Operativas/Eliminadas) igual que Prioridades/Reservas/Ventas

import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { inmobiliariasFilterPreset } from "./presets/inmobiliarias.preset";
import { inmobiliariasChipsFrom } from "./utils/inmobiliariasChips";

export default function FilterBarInmobiliarias({
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
  onSearchChange, // Callback opcional para búsqueda (manejo separado)
  value, // Valor inicial para sincronizar el estado (como en FilterBarPrioridades)
}) {
  // Configuración de campos para inmobiliarias (siguiendo patrón de Prioridades/Reservas/Ventas)
  const fields = useMemo(() => [
    {
      id: 'q',
      type: 'search',
      label: 'Búsqueda',
      placeholder: 'Nombre o razón social...',
      defaultValue: ''
    },
    {
      id: 'visibilidad',
      type: 'singleSelect', // Igual que Prioridades/Reservas/Ventas
      label: 'Visibilidad',
      defaultValue: 'OPERATIVO'
    },
    {
      id: 'comxventa',
      type: 'range',
      label: 'Comisión x Venta',
      defaultValue: { min: null, max: null }
    },
    {
      id: 'cantidadReservas',
      type: 'range',
      label: 'Cantidad de Reservas',
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

  // Catálogos para el filtro de visibilidad (igual que otros módulos)
  const catalogs = useMemo(() => ({
    visibilidad: [
      { value: 'OPERATIVO', label: 'Operativas' },
      { value: 'ELIMINADO', label: 'Eliminadas' },
    ]
  }), []);

  // Rangos para los filtros numéricos
  const ranges = useMemo(() => ({
    comxventa: inmobiliariasFilterPreset.ranges.comxventa,
    cantidadReservas: inmobiliariasFilterPreset.ranges.cantidadReservas,
    cantidadVentas: inmobiliariasFilterPreset.ranges.cantidadVentas,
    createdAt: inmobiliariasFilterPreset.ranges.createdAt,
  }), []);

  // Valores por defecto - visibilidad OPERATIVO por defecto
  const defaults = useMemo(() => ({
    ...inmobiliariasFilterPreset.defaults,
    visibilidad: 'OPERATIVO', // Default: mostrar solo operativas
  }), []);

  // Configuración de vistas
  const viewsConfig = useMemo(() => ({
    isInmo: false,
    sanitizeForRole: (filters) => filters
  }), []);

  // Formateador de opciones para visibilidad
  const optionFormatter = useMemo(() => ({
    visibilidad: (val) => val === 'OPERATIVO' ? 'Operativas' : val === 'ELIMINADO' ? 'Eliminadas' : val,
  }), []);

  // Handler para mapear visibilidad a estado (para compatibilidad con applyInmobiliariaFilters)
  const handleParamsChange = (paramsFromFB) => {
    const { q, ...paramsSinQ } = paramsFromFB || {};
    
    // Si viene visibilidad, mapearla a estado para el filtro
    if (paramsSinQ.visibilidad !== undefined) {
      // Si es OPERATIVO, enviar estado vacío (default muestra operativas)
      // Si es ELIMINADO, enviar estado con ELIMINADO
      const estadoMapped = paramsSinQ.visibilidad === 'ELIMINADO' 
        ? ['ELIMINADO'] 
        : []; // Vacío = default = OPERATIVO
      onParamsChange?.({ ...paramsSinQ, estado: estadoMapped, visibilidad: paramsSinQ.visibilidad });
    } else {
      onParamsChange?.(paramsSinQ);
    }
  };

  return (
    <FilterBarBase
      fields={fields}
      catalogs={catalogs}
      ranges={ranges}
      defaults={defaults}
      viewsConfig={viewsConfig}
      variant={variant}
      onParamsChange={handleParamsChange}
      onSearchChange={onSearchChange}
      chipsFormatter={inmobiliariasChipsFrom}
      optionFormatter={optionFormatter}
      userRole={userRole}
      initialValue={value} // Sincronizar estado con el valor de la página
    />
  );
}
