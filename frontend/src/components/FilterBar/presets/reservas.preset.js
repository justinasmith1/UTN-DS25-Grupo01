// src/components/FilterBar/presets/reservas.preset.js
// Preset de configuración para filtros de reservas

// Catálogos para filtros
export const INMOBILIARIAS = [
  { value: 1, label: 'Inmobiliaria Central' },
  { value: 2, label: 'Propiedades del Sur' },
  { value: 3, label: 'Inmobiliaria Norte' }
];

export const CALLES = [
  { value: 'REINAMORA', label: 'Reinamora' },
  { value: 'MACA', label: 'Maca' },
  { value: 'ZORZAL', label: 'Zorzal' },
  { value: 'CAUQUEN', label: 'Cauquén' },
  { value: 'ALONDRA', label: 'Alondra' },
  { value: 'JACANA', label: 'Jacana' },
  { value: 'TACUARITO', label: 'Tacuarito' },
  { value: 'JILGUERO', label: 'Jilguero' },
  { value: 'GOLONDRINA', label: 'Golondrina' },
  { value: 'CALANDRIA', label: 'Calandria' },
  { value: 'AGUILAMORA', label: 'Aguilamora' },
  { value: 'LORCA', label: 'Lorca' },
  { value: 'MILANO', label: 'Milano' }
];

export const reservasFilterPreset = {
  // Catálogos para filtros
  catalogs: {
    INMOBILIARIAS,
    CALLES
  },

  // Rangos para filtros numéricos
  ranges: {
    fechaReserva: {
      minLimit: new Date('2020-01-01').getTime(),
      maxLimit: new Date('2030-12-31').getTime(),
      step: 86400000, // 1 día en ms
      unit: ''
    },
    seña: {
      minLimit: 0,
      maxLimit: 1000000,
      step: 1000,
      unit: 'ARS'
    }
  },

  // Valores por defecto
  defaults: {
    q: '',
    inmobiliaria: null,
    calle: null,
    fechaReserva: { min: null, max: null },
    seña: { min: null, max: null }
  }
};
