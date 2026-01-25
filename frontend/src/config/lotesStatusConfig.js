// src/config/lotesStatusConfig.js
// Configuración centralizada de estados de lotes

export const LOTE_STATUS_CONFIG = {
  DISPONIBLE: { label: "Disponible", color: "#2952CC", variant: "info" }, // Azul
  RESERVADO: { label: "Reservado", color: "#18794E", variant: "success" }, // Verde
  VENDIDO: { label: "Vendido", color: "#FBBF24", variant: "warn" }, // Amarillo brillante
  "NO DISPONIBLE": { label: "No Disponible", color: "#475467", variant: "muted" },
  "EN PROMOCION": { label: "En Promoción", color: "#EA580C", variant: "orange" }, // Naranja/ámbar
  "CON PRIORIDAD": { label: "Con Prioridad", color: "#7C3AED", variant: "violet" }, // Violeta/índigo
  ALQUILADO: { label: "Alquilado", color: "#5B6BFF", variant: "indigo" },
};

