// src/components/FilterBar/presets/ventas.preset.js
export const ventasFilterPreset = {
  catalogs: {
    ESTADOS: ["INICIADA", "CON_BOLETO", "ESCRITURA_PROGRAMADA", "ESCRITURADO", "CANCELADA"],
    TIPO_PAGO: ["CONTADO", "TRANSFERENCIA", "FINANCIADO", "CHEQUE", "TARJETA"],
    // Incluimos "La Federala" para poder filtrar ventas sin inmobiliaria asociada
    INMOBILIARIAS: [
      "La Federala",
      "Andinolfi Inmobiliaria",
      "Andrea Gianfelice Inmb.",
      "Nicolas Spinosa Operaciones Inmobiliarias",
      "Martin Azcarate Negocios Inmobiliarios",
    ],
  },
  ranges: {
    fechaVenta: {
      minLimit: new Date("2020-01-01").getTime(),
      maxLimit: new Date("2030-12-31").getTime(),
      step: 86400000, // 1 día en ms
      unit: "días",
    },
    monto: { minLimit: 0, maxLimit: 1000000, step: 1000, unit: "USD" },
    plazoEscritura: { minLimit: 0, maxLimit: 365, step: 1, unit: "días" },
  },
  // Defaults en plural + compatibilidad legacy
  defaults: {
    q: "",
    estado: [],
    tipoPago: [],
    inmobiliarias: [],
    inmobiliaria: [], // legacy
    fechaVenta: { min: null, max: null },
    monto: { min: null, max: null },
    plazoEscritura: { min: null, max: null },
  },
};
