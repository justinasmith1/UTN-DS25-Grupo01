// components/FilterBar/FilterBarVentas.jsx
// Wrapper específico para ventas que usa FilterBarBase genérico

import { useMemo } from "react";
import FilterBarBase from "./FilterBarBase";
import { ventasFilterPreset } from "./presets/ventas.preset";
import { ventasChipsFrom, nice } from "./utils/ventasChips";


export default function FilterBarVentas({
  variant = "dashboard",
  userRole = "GENERAL",
  onParamsChange,
}) {
  // Configuración de campos para ventas
  const fields = useMemo(() => [
    {
      id: 'q',
      type: 'search',
      label: 'Búsqueda',
      placeholder: 'ID, lote, monto...',
      defaultValue: ''
    },
    {
      id: 'estado',
      type: 'multiSelect',
      label: 'Estado',
      defaultValue: []
    },
    {
      id: 'tipoPago',
      type: 'multiSelect',
      label: 'Tipo de Pago',
      defaultValue: []
    },
    {
      id: 'inmobiliaria',
      type: 'multiSelect',
      label: 'Inmobiliaria',
      defaultValue: [],
      useGrid: true
    },
    {
      id: 'fechaVenta',
      type: 'dateRange',
      label: 'Fecha de Venta',
      defaultValue: { min: null, max: null }
    },
    {
      id: 'monto',
      type: 'range',
      label: 'Monto',
      defaultValue: { min: null, max: null }
    },
    {
      id: 'plazoEscritura',
      type: 'range',
      label: 'Plazo Escritura',
      defaultValue: { min: null, max: null }
    }
  ], []);

  // Catálogos para ventas
  const catalogs = useMemo(() => ({
    estado: ventasFilterPreset.catalogs.ESTADOS,
    tipoPago: ventasFilterPreset.catalogs.SUBESTADOS,
    inmobiliaria: ventasFilterPreset.catalogs.CALLES,
  }), []);

  // Configuración de rangos para ventas
  const ranges = useMemo(() => ({
    fechaVenta: ventasFilterPreset.ranges.fechaVenta,
    monto: ventasFilterPreset.ranges.monto,
    plazoEscritura: ventasFilterPreset.ranges.plazoEscritura,
  }), []);

  // Valores por defecto para ventas
  const defaults = useMemo(() => ({
    q: "",
    estado: [],
    tipoPago: [],
    inmobiliaria: [],
    fechaVenta: { min: null, max: null },
    monto: { min: null, max: null },
    plazoEscritura: { min: null, max: null }
  }), []);

  // Configuración de vistas (sin RBAC complejo por ahora)
  const viewsConfig = useMemo(() => ({
    isInmo: false, // Por ahora no hay restricciones de inmobiliaria en ventas
    sanitizeForRole: (filters) => filters // Sin sanitización por ahora
  }), []);

  // Función para formatear opciones en el modal
  const optionFormatter = useMemo(() => ({
    estado: nice, // Formatear estados con nice()
    tipoPago: nice, // Formatear tipos de pago con nice()
    inmobiliaria: (val) => val, // Las inmobiliarias se muestran tal como están
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
      chipsFormatter={ventasChipsFrom}
      optionFormatter={optionFormatter}
    />
  );
}
