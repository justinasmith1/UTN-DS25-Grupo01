// src/components/FilterBar/presets/inmobiliarias.preset.js
// Preset de filtros para el módulo de inmobiliarias

export const inmobiliariasFilterPreset = {
  catalogs: {
    // Sin catálogos - solo usamos búsqueda general y rangos
  },
  
  ranges: {
    // Rangos para filtros numéricos
    comxventa: { 
      minLimit: 0, 
      maxLimit: 100, 
      step: 0.1, 
      unit: "%" 
    },
    cantidadReservas: { 
      minLimit: 0, 
      maxLimit: 300, 
      step: 1, 
      unit: "reservas" 
    },
    cantidadVentas: { 
      minLimit: 0, 
      maxLimit: 300, 
      step: 1, 
      unit: "ventas" 
    },
    createdAt: { 
      minLimit: new Date('2020-01-01').getTime(), 
      maxLimit: new Date('2030-12-31').getTime(), 
      step: 86400000, 
      unit: "días" 
    },
  },
  
  defaults: {
    // Valores por defecto para todos los filtros
    q: "", // Búsqueda general (cubre nombre, razón social, contacto)
    comxventa: { min: null, max: null }, // Rango de comisión
    cantidadReservas: { min: null, max: null }, // Rango de cantidad de reservas
    cantidadVentas: { min: null, max: null }, // Rango de cantidad de ventas
    createdAt: { min: null, max: null }, // Rango de fechas de creación
  },
};
