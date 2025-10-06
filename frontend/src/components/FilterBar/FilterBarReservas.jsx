// src/components/FilterBar/FilterBarReservas.jsx
// Wrapper para FilterBarBase específico para reservas

import React from 'react';
import FilterBarBase from './FilterBarBase';
import { reservasFilterPreset } from './presets/reservas.preset';
import { reservasChipsFrom, nice } from './utils/reservasChips';

export default function FilterBarReservas({
  variant = 'dashboard',
  userRole,
  onParamsChange,
  appliedFilters = {},
  ...props
}) {
  // Configuración de campos para reservas
  const fields = [
    {
      id: 'q',
      type: 'search',
      label: 'Buscar',
      placeholder: 'Cliente, inmobiliaria, lote...',
      defaultValue: ''
    },
    {
      id: 'fechaReserva',
      type: 'dateRange',
      label: 'Fecha de Reserva',
      defaultValue: { min: null, max: null }
    },
    {
      id: 'seña',
      type: 'range',
      label: 'Seña',
      defaultValue: { min: null, max: null }
    }
  ];

  // Configuración de vistas
  const viewsConfig = {
    enabled: true,
    views: [
      { id: 'all', label: 'Todas las reservas' },
      { id: 'recent', label: 'Reservas recientes' },
      { id: 'high-amount', label: 'Señas altas' }
    ]
  };

  return (
    <FilterBarBase
      fields={fields}
      catalogs={{}}
      ranges={reservasFilterPreset.ranges}
      defaults={{
        q: '',
        fechaReserva: { min: null, max: null },
        seña: { min: null, max: null }
      }}
      viewsConfig={viewsConfig}
      chipsFormatter={reservasChipsFrom}
      variant={variant}
      userRole={userRole}
      onParamsChange={onParamsChange}
      appliedFilters={appliedFilters}
      {...props}
    />
  );
}
