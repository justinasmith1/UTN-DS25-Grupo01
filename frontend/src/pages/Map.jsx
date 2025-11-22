import { useMemo, useState, useCallback } from "react";
import { Container } from "react-bootstrap";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";

import FilterBarLotes from "../components/FilterBar/FilterBarLotes";
import { applyLoteFilters } from "../utils/applyLoteFilters";
import MapaInteractivo from "../components/Mapa/MapaInteractivo";

// Estilos específicos para la vista de mapa
const customStyles = `
  .map-container { 
    height: 600px; 
    position: relative; 
    background-color: #e6efe9;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    /* Optimizaciones de rendimiento */
    contain: layout style paint;
    transform: translateZ(0);
    isolation: isolate;
  }

  .mapa-svg-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Optimizaciones de rendimiento */
    contain: layout style paint;
    transform: translateZ(0);
    will-change: contents;
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
  }

  .mapa-svg-wrapper svg {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    display: block;
    /* Optimizaciones de renderizado SVG */
    shape-rendering: geometricPrecision;
    text-rendering: optimizeLegibility;
  }
`;

// Normalizo el estado para poder mapearlo a un "variant" visual
const normalizeEstadoKey = (value) => {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/_/g, " ")
    .trim()
    .toUpperCase(); // ej: "EN_PROMOCION" -> "EN PROMOCION"
};

// De un estado (ALQUILADO, DISPONIBLE, etc.) saco un "variant" visual
const getEstadoVariant = (estadoRaw) => {
  const key = normalizeEstadoKey(estadoRaw);

  const map = {
    DISPONIBLE: "success",
    "EN PROMOCION": "warn",
    RESERVADO: "info",
    ALQUILADO: "indigo",
    VENDIDO: "success",
    "NO DISPONIBLE": "danger",
  };

  return map[key] || "muted";
};

// De un lote tomo el estado como hace applyLoteFilters (status || estado)
const getEstadoFromLote = (lote) => lote?.status || lote?.estado || "";

export default function Map() {
  // Tomo del Layout los lotes y el handler para abrir el side panel
  const ctx = useOutletContext() || {};
  const allLots = ctx.allLots || ctx.lotes || ctx.lots || [];
  const { openSidePanel } = ctx;

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
      {/* Estilos locales para esta página */}
      <style>{customStyles}</style>

      {/* Barra de filtros igual que en el dashboard, pero aplicada al mapa */}
      <FilterBarLotes
        variant="map"
        userRole={userRole}
        onParamsChange={handleParamsChange}
      />

      <Container fluid className="py-4">
        {/* Contenedor del mapa interactivo */}
        <div className="map-container">
          <MapaInteractivo
            onLoteClick={handleLoteClick}
            variantByMapId={variantByMapId}
            activeMapIds={activeMapIds}
            labelByMapId={labelByMapId}
          />
        </div>
      </Container>
    </>
  );
}
