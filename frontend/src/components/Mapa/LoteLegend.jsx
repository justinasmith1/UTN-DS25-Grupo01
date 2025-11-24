// src/components/Mapa/LoteLegend.jsx
import React from "react";
import { LOTE_STATUS_CONFIG } from "../../config/lotesStatusConfig";
import { getEstadoVariant } from "../Table/TablaLotes/cells/StatusBadge";

// Función para obtener el color basado en el variant (igual que en MapaInteractivo.jsx - colores del dashboard)
const getColorForVariant = (variant, estadoKey = null) => {
  // VENDIDO tiene un color amarillo brillante especial, diferente de EN PROMOCION
  if (estadoKey && estadoKey === "VENDIDO") {
    return "#FBBF24"; // Amarillo brillante (más claro que EN PROMOCION)
  }
  
  const colors = {
    success: "#18794E", // color del texto en .tl-badge--success
    warn: "#9A5C00",    // color del texto en .tl-badge--warn (EN PROMOCION)
    info: "#2952CC",    // color del texto en .tl-badge--info
    indigo: "#5B6BFF",  // color del texto en .tl-badge--indigo
    danger: "#C23B3B",  // color del texto en .tl-badge--danger
    muted: "#475467",   // color del texto en .tl-badge--muted
  };
  return colors[variant] || colors.muted;
};

function LoteLegend({ className = "" }) {
  // Orden de estados para mostrar en la leyenda
  const estadosOrden = [
    "DISPONIBLE",
    "RESERVADO",
    "EN PROMOCION",
    "ALQUILADO",
    "VENDIDO",
    "NO DISPONIBLE",
  ];

  return (
    <div
      className={`lote-legend ${className}`}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem",
        padding: "0.5rem 0.875rem",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        fontSize: "0.875rem",
        marginRight: "0.55rem",
      }}
    >
      {estadosOrden.map((estadoKey) => {
        const config = LOTE_STATUS_CONFIG[estadoKey];
        if (!config) return null;

        // Obtener el variant que usa el dashboard para este estado
        const variant = getEstadoVariant(estadoKey);
        // Obtener el color que usa el dashboard y el mapa para este variant
        // Pasar el estadoKey para detectar VENDIDO y usar color especial
        const color = getColorForVariant(variant, estadoKey);

        return (
          <div
            key={estadoKey}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: color,
                borderRadius: "3px",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "#374151", fontWeight: 500 }}>
              {config.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default LoteLegend;

