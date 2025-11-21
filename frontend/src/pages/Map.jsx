import { useMemo, useState } from "react";
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
  }

  .mapa-svg-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mapa-svg-wrapper svg {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    display: block;
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
        onParamsChange={setParams}
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
