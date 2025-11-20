// src/components/Mapa/MapaInteractivo.jsx
import React from "react";
// Importo el SVG como texto crudo para poder insertarlo en el DOM
import mapaSvg from "../../assets/Mapa La Federala - InteractivoFinal.svg?raw";

/**
 * Componente de mapa SVG puro.
 *
 * Props:
 * - onLoteClick?: (mapId: string) => void
 *   → Lo usamos para avisarle al padre (Map.jsx) qué lote se clickeó.
 */
function MapaInteractivo({ onLoteClick }) {
  // Manejo el click dentro del SVG
  const handleSvgClick = (event) => {
    // Busco el elemento más cercano cuyo id empiece con "Lote"
    const loteElement = event.target.closest("[id^='Lote']");

    // Si hice click en algo que no es un lote, no hago nada
    if (!loteElement) return;

    const mapId = loteElement.id;

    // Log básico para debug
    console.log("Lote clickeado en el mapa (mapId desde SVG):", mapId);

    // Si el padre nos pasó un callback, lo ejecutamos
    if (typeof onLoteClick === "function") {
      onLoteClick(mapId);
    }
  };

  return (
    <div
      className="mapa-svg-wrapper"
      // Ocupo todo el espacio del contenedor del mapa
      style={{ width: "100%", height: "100%" }}
      onClick={handleSvgClick}
      // Inserto el SVG generado en Figma tal cual en el DOM
      dangerouslySetInnerHTML={{ __html: mapaSvg }}
    />
  );
}

export default MapaInteractivo;
