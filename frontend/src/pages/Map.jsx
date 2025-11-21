import { useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";

import FilterBarLotes from "../components/FilterBar/FilterBarLotes";
import { applyLoteFilters } from "../utils/applyLoteFilters";
import MapaInteractivo from "../components/Mapa/MapaInteractivo";

// 🎯 Componente de mapa principal. 
// Muestra el filtro + el SVG interactivo y conecta el click en un lote
// con los datos reales (lots/allLots) y el SidePanel del Layout.
const customStyles = `
  .map-container { 
    height: 600px; 
    position: relative; 
    background-color: #e6efe9;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  .parcel-overlay { 
    position: absolute; 
    width: 48px; 
    height: 48px; 
    border: 2px solid transparent; 
    cursor: pointer; 
    transition: all 0.15s ease;
    border-radius: 12px;
  }
  .parcel-overlay:hover {
    border-color: #ffd700 !important;
    background-color: rgba(255, 215, 0, 0.3) !important;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
    transform: scale(1.1);
  }
  .parcel-label {
    position: absolute;
    top: -32px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    opacity: 0;
    transition: all 0.15s ease;
    z-index: 10;
  }
  .parcel-overlay:hover .parcel-label { 
    opacity: 1; 
    transform: translateX(-50%) translateY(-4px);
  }
`;

export default function Map() {
  // 🔹 Recibimos del Layout todo el contexto común (lotes, handlers, etc.)
  const ctx = useOutletContext() || {};

  // Lotes de la API: allLots = todos, lots = versión filtrada que usamos localmente
  const allLots = ctx.allLots || ctx.lots || [];

  // Handler que viene de Layout.jsx y abre el SidePanel:
  // const handleOpenPanel = (lotId) => { setSelectedLotId(lotId); setShowPanel(true); };
  const { openSidePanel } = ctx;

  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase();

  // Filtros propios del mapa (independientes de los filtros globales del Layout)
  const [params, setParams] = useState({});
  const lots = useMemo(() => applyLoteFilters(allLots, params), [allLots, params]);

  /**
   * 🧠 handleLoteClick:
   * - Lo llama MapaInteractivo cuando el usuario hace click en un polígono del SVG.
   * - mapId = id del elemento en el SVG (ej: "Lote16-3").
   * - Buscamos el lote real por mapId y, si existe, abrimos el SidePanel
   *   usando openSidePanel(lote.id) que viene del Layout.
   */
  const handleLoteClick = (mapId) => {
    if (!mapId) return;

    console.log("[Map.jsx] handleLoteClick → mapId:", mapId);

    // Busco primero entre los lotes filtrados del mapa; si no está, en todos
    const lote =
      lots.find((l) => l.mapId === mapId) ||
      allLots.find((l) => l.mapId === mapId);

    if (!lote) {
      console.warn(
        "[Map.jsx] No se encontró un lote con mapId =",
        mapId,
        "Revisar que el mapId del SVG y el de la BD coincidan."
      );
      return;
    }

    console.log("[Map.jsx] Lote encontrado por mapId:", { mapId, lote });

    if (typeof openSidePanel === "function") {
      // 🚪 Conectamos con el Layout: abre el SidePanel para ese lote.
      // Firma real en Layout: handleOpenPanel(lotId)
      openSidePanel(lote.id);
    } else {
      console.warn(
        "[Map.jsx] openSidePanel NO es una función. Revisar que se pase en el Outlet context del Layout."
      );
    }
  };

  // La función positions anterior ya no se usa (los polígonos los maneja el SVG)
  // La dejo comentada por si más adelante querés overlays adicionales.
  // const positions = (idx) => ({
  //   top: `${20 + (idx % 6) * 12}%`,
  //   left: `${25 + (idx % 8) * 8}%`,
  // });

  return (
    <>
      {/* Estilos propios de la vista de mapa */}
      <style>{customStyles}</style>

      {/* FilterBarLotes con padding y offset propios del Mapa */}
      <FilterBarLotes variant="map" userRole={userRole} onParamsChange={setParams} />

      <Container fluid className="py-4">
        <div className="text-muted mb-2">
          {/* Mantengo el contador de lotes filtrados vs totales */}
          Lotes en mapa: {lots.length} de {allLots.length}
        </div>

        <div className="map-container">
          {/*
            Reemplazo la imagen estática + overlays falsos 
            por el mapa SVG interactivo.
            Ahora el mapa:
              - Detecta el lote clickeado en el SVG
              - Llama a handleLoteClick(mapId)
              - Que a su vez abre el SidePanel del Layout con ese lote
          */}
          <MapaInteractivo onLoteClick={handleLoteClick} />
        </div>
      </Container>
    </>
  );
}
