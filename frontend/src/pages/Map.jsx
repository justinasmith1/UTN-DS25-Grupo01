import { useMemo, useState, useCallback } from "react";
import { Container } from "react-bootstrap";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";

import FilterBarLotes from "../components/FilterBar/FilterBarLotes";
import { applyLoteFilters } from "../utils/applyLoteFilters";
import MapaInteractivo from "../components/Mapa/MapaInteractivo";
import LoteLegend from "../components/Mapa/LoteLegend";
import {
  normalizeEstadoKey,
  getEstadoVariant,
  getEstadoFromLote,
} from "../utils/mapaUtils";

import "../components/Mapa/Map.css";

export default function Map() {
  // Tomo del Layout los lotes y el handler para abrir el side panel
  const ctx = useOutletContext() || {};
  const allLots = ctx.allLots || ctx.lotes || ctx.lots || [];
  const { openSidePanel, selectedLotId, showPanel } = ctx;

  const { user } = useAuth();
  const userRole = (user?.role ?? user?.rol ?? "ADMIN")
    .toString()
    .trim()
    .toUpperCase();

  // Estado local de filtros (misma idea que en el dashboard)
  const [params, setParams] = useState({});
  
  // Handler para convertir filtros BAR de formato anidado a plano
  const handleParamsChange = useCallback((patch) => {
    if (!patch || Object.keys(patch).length === 0) { 
      setParams({}); 
      return; 
    }
    
    // Convertir objetos de rango ({ min, max }) a parámetros planos (frenteMin, frenteMax, etc.)
    const convertedParams = { ...patch };
    
    // Convertir rangos a formato plano que espera applyLoteFilters
    if (patch.frente && (patch.frente.min !== null || patch.frente.max !== null)) {
      convertedParams.frenteMin = patch.frente.min !== null ? patch.frente.min : undefined;
      convertedParams.frenteMax = patch.frente.max !== null ? patch.frente.max : undefined;
      delete convertedParams.frente;
    }
    
    if (patch.fondo && (patch.fondo.min !== null || patch.fondo.max !== null)) {
      convertedParams.fondoMin = patch.fondo.min !== null ? patch.fondo.min : undefined;
      convertedParams.fondoMax = patch.fondo.max !== null ? patch.fondo.max : undefined;
      delete convertedParams.fondo;
    }
    
    if (patch.sup && (patch.sup.min !== null || patch.sup.max !== null)) {
      convertedParams.supMin = patch.sup.min !== null ? patch.sup.min : undefined;
      convertedParams.supMax = patch.sup.max !== null ? patch.sup.max : undefined;
      delete convertedParams.sup;
    }
    
    if (patch.precio && (patch.precio.min !== null || patch.precio.max !== null)) {
      convertedParams.priceMin = patch.precio.min !== null ? patch.precio.min : undefined;
      convertedParams.priceMax = patch.precio.max !== null ? patch.precio.max : undefined;
      delete convertedParams.precio;
    }
    
    setParams((prev) => {
      // Limpiar parámetros de rango antiguos si existen
      const cleaned = { ...prev };
      delete cleaned.frente;
      delete cleaned.fondo;
      delete cleaned.sup;
      delete cleaned.precio;
      delete cleaned.frenteMin;
      delete cleaned.frenteMax;
      delete cleaned.fondoMin;
      delete cleaned.fondoMax;
      delete cleaned.supMin;
      delete cleaned.supMax;
      delete cleaned.priceMin;
      delete cleaned.priceMax;
      
      return { ...cleaned, ...convertedParams };
    });
  }, []);

  // Lotes filtrados usando la utilidad que ya tenés
  const filteredLots = useMemo(
    () => applyLoteFilters(allLots, params),
    [allLots, params]
  );

  // Para cada lote, defino el "variant" visual en función de su estado
  const variantByMapId = useMemo(() => {
    const map = {};
    (allLots || []).forEach((lote) => {
      if (!lote?.mapId) return;
      const estadoRaw = getEstadoFromLote(lote);
      map[lote.mapId] = getEstadoVariant(estadoRaw);
    });
    return map;
  }, [allLots]);

  // Para cada lote, guardo su estado (para usar colores especiales como VENDIDO)
  const estadoByMapId = useMemo(() => {
    const map = {};
    (allLots || []).forEach((lote) => {
      if (!lote?.mapId) return;
      const estadoRaw = getEstadoFromLote(lote);
      map[lote.mapId] = normalizeEstadoKey(estadoRaw);
    });
    return map;
  }, [allLots]);

  // Para cada lote, el número que quiero mostrar dentro de la parcela
  const labelByMapId = useMemo(() => {
    const map = {};
    (allLots || []).forEach((lote) => {
      if (!lote?.mapId || lote?.numero == null) return;
      map[lote.mapId] = String(lote.numero);
    });
    return map;
  }, [allLots]);

  // Ids de lotes que pasan el filtro actual (solo estos se verán opacos y clickeables)
  const activeMapIds = useMemo(
    () => filteredLots.map((l) => l.mapId).filter(Boolean),
    [filteredLots]
  );

  // Obtener el mapId del lote seleccionado (para destacarlo en el mapa)
  const selectedMapId = useMemo(() => {
    if (!selectedLotId || !showPanel) return null;
    const lote = allLots.find((l) => l.id === selectedLotId);
    return lote?.mapId || null;
  }, [selectedLotId, showPanel, allLots]);

  // Cuando clickeo un lote en el mapa, abro el side panel del lote correspondiente
  const handleLoteClick = (mapId) => {
    if (!mapId) return;
    const lote = filteredLots.find((l) => l.mapId === mapId);
    if (!lote) return;

    if (typeof openSidePanel === "function") {
      openSidePanel(lote.id);
    } else {
      console.warn(
        "[Map.jsx] openSidePanel no está disponible en el contexto del Outlet."
      );
    }
  };

  return (
    <>
      {/* Título y leyenda */}
      <div className="map-header">
        <div className="map-header-left">
          <h3>Mapa Interactivo de Lotes</h3>
          <div className="map-info-messages">
            {filteredLots.length > 0 ? (
              <span className="map-info-count">
                {filteredLots.length} {filteredLots.length === 1 ? "Lote mostrado" : "Lotes mostrados"}
              </span>
            ) : (
              <span className="map-info-empty">No hay lotes que coincidan con este filtro</span>
            )}
          </div>
        </div>
        <LoteLegend />
      </div>

      {/* Barra de filtros */}
      <FilterBarLotes
        variant="map"
        userRole={userRole}
        onParamsChange={handleParamsChange}
      />

      <Container fluid className="map-container-wrapper">
        {/* Contenedor del mapa interactivo */}
        <div className="map-container">
          
          {/* Mapa */}
          <div className="mapa-wrapper">
            <MapaInteractivo
              onLoteClick={handleLoteClick}
              variantByMapId={variantByMapId}
              activeMapIds={activeMapIds}
              labelByMapId={labelByMapId}
              estadoByMapId={estadoByMapId}
              selectedMapId={selectedMapId}
            />
          </div>
        </div>
      </Container>
    </>
  );
}
