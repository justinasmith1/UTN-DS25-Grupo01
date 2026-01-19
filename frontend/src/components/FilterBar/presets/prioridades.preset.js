// src/components/FilterBar/presets/prioridades.preset.js
// Preset de configuración para filtros de prioridades

export const prioridadesFilterPreset = {
  catalogs: {
    ESTADOS: [
      "ACTIVA",
      "FINALIZADA",
      "CANCELADA",
      "EXPIRADA",
    ],
  },

  ranges: {
    // Rango de fechas de vencimiento (fechaFin)
    fechaFin: {
      minLimit: new Date("2025-01-01").getTime(),
      maxLimit: new Date("2030-12-31").getTime(),
      step: 86400000, // 1 día
      unit: "",
    },
  },

  // Defaults coherentes con FilterBarBase
  defaults: {
    q: "",
    estado: [],
    owner: [], // Chips: "La Federala" + inmobiliarias dinámicas
    fechaFin: { min: null, max: null },
  },
};

export default prioridadesFilterPreset;
