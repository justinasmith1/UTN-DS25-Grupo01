// src/config/lotesStatusConfig.js
// Configuración centralizada de estados de lotes

export const LOTE_STATUS_CONFIG = {
  DISPONIBLE: { label: "Disponible", color: "#2952CC", variant: "info" }, // Color que tenía RESERVADO (azul)
  RESERVADO: { label: "Reservado", color: "#18794E", variant: "success" }, // Color que tenía DISPONIBLE (verde)
  VENDIDO: { label: "Vendido", color: "#FBBF24", variant: "warn" }, // Amarillo brillante (diferente de EN PROMOCION)
  "NO DISPONIBLE": { label: "No Disponible", color: "#475467", variant: "muted" },
  "EN PROMOCION": { label: "En Promoción", color: "#9A5C00", variant: "warn" },
  ALQUILADO: { label: "Alquilado", color: "#5B6BFF", variant: "indigo" },
};

