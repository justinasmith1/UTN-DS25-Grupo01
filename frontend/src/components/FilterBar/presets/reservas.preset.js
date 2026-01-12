// src/components/FilterBar/presets/reservas.preset.js
// Preset de configuración para filtros de reservas

export const reservasFilterPreset = {
  catalogs: {
    // Estados: dejalo vacío si los vas a inyectar desde el container;
    // o completalo acá con tus 9 estados reales
    ESTADOS: [
      "OPERATIVO",
      "ACTIVA",
      "CANCELADA",
      "ACEPTADA",
      "RECHAZADA",
      "EXPIRADA",
      "CONTRAOFERTA",
      "ELIMINADO",
    ],
    // Reutilizamos los nombres tal cual, así no sale [Object Object]
    INMOBILIARIAS: [
      "La Federala",
      "Andinolfi Inmobiliaria",
      "Andrea Gianfelice Inmb.",
      "Nicolas Spinosa Operaciones Inmobiliarias",
      "Martin Azcarate Negocios Inmobiliarios",
    ],
  },

  ranges: {
    // Igual que fechaVenta en ventas, pero para reservas
    fechaReserva: {
      minLimit: new Date("2020-01-01").getTime(),
      maxLimit: new Date("2030-12-31").getTime(),
      step: 86400000, // 1 día
      unit: "",
    },
    // NUEVO: fecha de creación
    fechaFinReserva: {
      minLimit: new Date("2020-01-01").getTime(),
      maxLimit: new Date("2030-12-31").getTime(),
      step: 86400000,
      unit: "",
    },
    // Ajuste: rango chico y USD (antes ARS enorme)
    seña: {
      minLimit: 0,
      maxLimit: 20000, // "mucho menor" para tu uso; ajustalo si necesitás
      step: 100,       // paso razonable
      unit: "USD",
    },
  },

  // Defaults coherentes con FilterBarBase
  defaults: {
    q: "",
    estado: [],
    inmobiliarias: [],
    fechaReserva: { min: null, max: null },
    fechaFinReserva: { min: null, max: null },
    seña: { min: null, max: null },
  },
};

export default reservasFilterPreset;
