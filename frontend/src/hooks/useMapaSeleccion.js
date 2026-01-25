// frontend/src/hooks/useMapaSeleccion.js
// Hook reutilizable para manejar la selección y vista previa del mapa
// Funciona para Reservas, Ventas y Prioridades

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para manejar la lógica de "Ver en mapa" con selección múltiple
 * 
 * @param {Object} options - Opciones de configuración
 * @param {Array} options.rows - Filas de datos (reservas, ventas o prioridades)
 * @param {Array} options.selectedIds - IDs de filas seleccionadas
 * @param {Function} options.getLoteData - Función que extrae { loteId, mapId } de una fila
 * @param {Function} options.getMetadata - Función que extrae metadata específica de una fila para el mapa
 * @param {Object} options.lotesIndex - Índice de lotes por ID para búsqueda rápida
 * @param {string} options.source - Fuente de datos: 'reservas', 'ventas' o 'prioridades'
 * 
 * @returns {Object} - Estado y funciones para manejar el flujo de mapa
 */
export function useMapaSeleccion({
  rows = [],
  selectedIds = [],
  getLoteData,
  getMetadata,
  lotesIndex = {},
  source = 'reservas'
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMapIds, setPreviewMapIds] = useState([]);
  const [previewMetadata, setPreviewMetadata] = useState({});
  const navigate = useNavigate();

  // Contador de seleccionados
  const selectedCount = useMemo(() => selectedIds.length, [selectedIds.length]);

  // Obtener mapIds y metadata de las filas seleccionadas
  const getSelectedMapData = useCallback(() => {
    if (selectedIds.length === 0) return { mapIds: [], metadata: {} };
    
    const selectedRows = rows.filter((row) => 
      selectedIds.includes(String(row.id))
    );
    
    const mapIds = [];
    const metadata = {};
    
    selectedRows.forEach((row) => {
      try {
        // Obtener datos del lote
        const loteData = getLoteData(row, lotesIndex);
        if (!loteData) return;
        
        const { loteId, mapId } = loteData;
        if (!mapId) return;
        
        mapIds.push(mapId);
        
        // Obtener metadata específica del módulo
        if (getMetadata) {
          const rowMetadata = getMetadata(row, loteData);
          if (rowMetadata) {
            // Agrupar por loteId (puede haber múltiples reservas/ventas/prioridades por lote)
            if (!metadata[loteId]) {
              metadata[loteId] = [];
            }
            metadata[loteId].push(rowMetadata);
          }
        }
      } catch (err) {
        console.error(`Error procesando fila ${row.id}:`, err);
      }
    });
    
    return { mapIds: [...new Set(mapIds)], metadata };
  }, [rows, selectedIds, getLoteData, getMetadata, lotesIndex]);

  // Abrir modal de vista previa
  const openPreview = useCallback(() => {
    if (selectedIds.length === 0) return;
    
    const { mapIds, metadata } = getSelectedMapData();
    
    if (mapIds.length > 0) {
      setPreviewMapIds(mapIds);
      setPreviewMetadata(metadata);
      setPreviewOpen(true);
    }
  }, [selectedIds, getSelectedMapData]);

  // Cerrar modal de vista previa
  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    // No limpiar mapIds inmediatamente para evitar parpadeo
    setTimeout(() => {
      setPreviewMapIds([]);
      setPreviewMetadata({});
    }, 300);
  }, []);

  // Navegar al mapa completo con los lotes seleccionados
  const goToMapaCompleto = useCallback(() => {
    if (previewMapIds.length === 0) return;
    
    // Navegar usando location.state para pasar metadata estructurada
    navigate('/map', {
      state: {
        mapHighlight: {
          loteIds: previewMapIds,
          metaByLoteId: previewMetadata,
          source: source
        }
      }
    });
    
    closePreview();
  }, [previewMapIds, previewMetadata, source, navigate, closePreview]);

  return {
    // Estado
    previewOpen,
    previewMapIds,
    previewMetadata,
    selectedCount,
    
    // Acciones
    openPreview,
    closePreview,
    goToMapaCompleto,
  };
}
