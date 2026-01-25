// src/components/Mapa/LoteLegend.jsx
import React from "react";
import { LOTE_STATUS_CONFIG } from "../../config/lotesStatusConfig";
import { getEstadoVariant, getColorForVariant } from "../../utils/mapaUtils";

function LoteLegend({ className = "" }) {
  // Orden de estados para mostrar en la leyenda
  const estadosOrden = [
    "DISPONIBLE",
    "RESERVADO",
    "EN PROMOCION",
    "CON PRIORIDAD",
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

