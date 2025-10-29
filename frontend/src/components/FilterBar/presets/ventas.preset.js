// src/components/FilterBar/presets/ventas.preset.js
// ----------------------------------------------------------------------------
// Preset del módulo Ventas para la FilterBar existente.
// Centraliza catálogos (ESTADOS, TIPOS_PAGO, INMOBILIARIAS).
// ----------------------------------------------------------------------------

export const ventasFilterPreset = {
  // Catálogos para ventas
  catalogs: {
    ESTADOS: ["INICIADA", "CON_BOLETO", "ESCRITURA_PROGRAMADA", "ESCRITURADO"],
    TIPO_PAGO: ["CONTADO", "TRANSFERENCIA", "FINANCIADO", "CHEQUE", "TARJETA"], // Para tipos de pago
    INMOBILIARIAS: ["Andinolfi Inmobiliaria", "Inmobiliaria B", "Inmobiliaria C", "Inmobiliaria D"], // Para inmobiliarias (datos de prueba)
  },

  // Configuración de rangos para ventas
  ranges: {
    fechaVenta: { minLimit: new Date('2020-01-01').getTime(), maxLimit: new Date('2030-12-31').getTime(), step: 86400000, unit: "días" }, // timestamp en ms
    monto: { minLimit: 0, maxLimit: 1000000, step: 1000, unit: "USD" },
    plazoEscritura: { minLimit: 0, maxLimit: 365, step: 1, unit: "días" },
  },

  // Valores por defecto para ventas
  defaults: {
    q: "",
    estado: [],
    tipoPago: [],
    inmobiliaria: [],
    fechaVenta: { min: null, max: null },
    monto: { min: null, max: null },
    plazoEscritura: { min: null, max: null }
  },
};
