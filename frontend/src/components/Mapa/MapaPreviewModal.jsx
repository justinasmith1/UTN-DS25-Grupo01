// frontend/src/components/Mapa/MapaPreviewModal.jsx
// Modal reutilizable para vista previa del mapa con lotes seleccionados
// Usado por Reservas, Ventas y Prioridades

import { X } from 'lucide-react';
import MapaInteractivo from './MapaInteractivo';

/**
 * Modal de vista previa del mapa con lotes seleccionados
 * 
 * @param {Object} props - Props del componente
 * @param {boolean} props.open - Si el modal está abierto
 * @param {Function} props.onClose - Callback al cerrar el modal
 * @param {Function} props.onVerMapaCompleto - Callback al clickear "Ver mapa completo"
 * @param {Array<string>} props.selectedMapIds - IDs de mapas seleccionados
 * @param {Object} props.variantByMapId - Variantes de color por mapId
 * @param {Array<string>} props.activeMapIds - IDs de mapas activos
 * @param {Object} props.labelByMapId - Etiquetas por mapId
 * @param {Object} props.estadoByMapId - Estados por mapId
 */
export default function MapaPreviewModal({
  open,
  onClose,
  onVerMapaCompleto,
  selectedMapIds = [],
  variantByMapId = {},
  activeMapIds = [],
  labelByMapId = {},
  estadoByMapId = {},
}) {
  if (!open || selectedMapIds.length === 0) return null;

  const count = selectedMapIds.length;
  const lotesLabel = count === 1 ? 'lote' : 'lotes';

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.12)',
          zIndex: 1999
        }}
        onClick={onClose}
      />
      
      {/* Card del modal */}
      <div 
        style={{
          position: 'fixed',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          width: 'min(950px, 80vw)',
          maxHeight: '80vh',
          backgroundColor: '#fff',
          borderRadius: '12px',
          border: '1px solid rgba(0,0,0,0.12)',
          boxShadow: '0 14px 34px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          backgroundColor: '#eaf3ed',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          flexShrink: 0
        }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            Vista previa del mapa ({count} {lotesLabel})
          </h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="tl-btn tl-btn--soft"
              onClick={onVerMapaCompleto}
              style={{ fontSize: '0.875rem', padding: '6px 16px' }}
            >
              Ver mapa completo
            </button>
            <button
              type="button"
              className="tl-btn tl-btn--ghost"
              onClick={onClose}
              style={{ 
                padding: '4px 8px',
                minWidth: 'auto',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cuerpo con el mapa */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          backgroundColor: '#f9fafb',
          position: 'relative',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <MapaInteractivo
            isPreview={true}
            selectedMapIds={selectedMapIds}
            variantByMapId={variantByMapId}
            activeMapIds={activeMapIds}
            labelByMapId={labelByMapId}
            estadoByMapId={estadoByMapId}
          />
        </div>
      </div>
    </>
  );
}
