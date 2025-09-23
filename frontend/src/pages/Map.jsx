import { useMemo, useState } from "react";
import { Container } from "react-bootstrap";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";

import FilterBar from "../components/FilterBar/FilterBar";
import { applyLoteFilters } from "../utils/applyLoteFilters";

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
  const ctx = useOutletContext() || {};
  const allLots = ctx.allLots || ctx.lots || [];

  const { openSidePanel } = ctx;
  const { user } = useAuth()
  const userRole = (user?.role ?? user?.rol ?? "ADMIN").toString().trim().toUpperCase()

  const [params, setParams] = useState({});
  const lots = useMemo(() => applyLoteFilters(allLots, params), [allLots, params]);

  const positions = (idx) => ({
    top: `${20 + (idx % 6) * 12}%`,
    left: `${25 + (idx % 8) * 8}%`,
  });

  return (
    <>
      <style>{customStyles}</style>

      {/* FilterBar con padding y offset propios del Mapa */}
      <FilterBar variant="map" userRole={userRole} onParamsChange={setParams} />

      <Container fluid className="py-4">
        <div className="text-muted mb-2">
          Lotes en mapa: {lots.length} de {allLots.length}
        </div>

        <div className="map-container">
          <img
            src="https://lafederalaclub.com/contenidos/uploads/2025/04/Plano-con-Vendidos.jpg"
            alt="Mapa del Club de Campo La Federala"
            className="img-fluid w-100 h-100"
            style={{ objectFit: "contain" }}
          />

          {lots.map((lot, index) => (
            <div
              key={lot.id}
              className="parcel-overlay"
              style={positions(index)}
              onClick={() => openSidePanel?.(lot.id)}
            >
              <div className="parcel-label">{lot.id}</div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
