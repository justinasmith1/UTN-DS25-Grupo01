// src/components/FilterBar/presets/lotes.preset.js
// ----------------------------------------------------------------------------
// Preset del módulo Lotes para la FilterBar existente.
// Centraliza catálogos (ESTADOS, SUBESTADOS, CALLES).
// ----------------------------------------------------------------------------

export const lotesFilterPreset = {
  // Catálogos visibles (se filtran por RBAC dentro del componente)
  catalogs: {
    ESTADOS: ["DISPONIBLE", "NO_DISPONIBLE", "RESERVADO", "VENDIDO", "ALQUILADO"],
    SUBESTADOS: ["CONSTRUIDO", "EN_CONSTRUCCION", "NO_CONSTRUIDO"],
    CALLES: [
      "REINAMORA",
      "MACA",
      "ZORZAL",
      "CAUQUEN",
      "ALONDRA",
      "JACANA",
      "TACUARITO",
      "JILGUERO",
      "GOLONDRINA",
      "CALANDRIA",
      "AGUILAMORA",
      "LORCA",
      "MILANO",
    ],
  },

  // Valores iniciales
  defaults: {
    q: "",
    estado: [],
    subestado: [],
    calle: [],
    frente: { min: 0, max: 100 },
    fondo: { min: 0, max: 100 },
    sup: { min: 0, max: 5000 },
    precio: { min: 0, max: 300000 },
    deudor: null,
  },

  // Configuracion de rangos
  ranges: {
    frente: { minLimit: 0, maxLimit: 100, step: 0.1, unit: "m" },
    fondo:  { minLimit: 0, maxLimit: 100, step: 0.1, unit: "m" },
    sup:    { minLimit: 0, maxLimit: 5000, step: 1,   unit: "m²" },
    precio: { minLimit: 0, maxLimit: 300000, step: 100, unit: "USD" },
  },
};
