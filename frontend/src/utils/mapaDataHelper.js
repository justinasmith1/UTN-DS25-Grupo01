// frontend/src/utils/mapaDataHelper.js
// Hook para preparar datos del mapa (evita duplicación en tablas)

import { useMemo } from 'react';
import { getEstadoFromLote, getEstadoVariant, normalizeEstadoKey } from './mapaUtils';

/**
 * Hook para preparar los datos necesarios para renderizar el mapa
 * Retorna variantByMapId, estadoByMapId, labelByMapId y allActiveMapIds
 * 
 * @param {Array} lotes - Array de lotes
 * @returns {Object} - Objeto con variantByMapId, estadoByMapId, labelByMapId y allActiveMapIds
 */
export function usePrepareMapaData(lotes = []) {
  const variantByMapId = useMemo(() => {
    const map = {};
    if (!lotes?.length) return map;
    lotes.forEach((lote) => {
      if (!lote?.mapId) return;
      const estadoRaw = getEstadoFromLote(lote);
      map[lote.mapId] = getEstadoVariant(estadoRaw);
    });
    return map;
  }, [lotes]);

  const estadoByMapId = useMemo(() => {
    const map = {};
    if (!lotes?.length) return map;
    lotes.forEach((lote) => {
      if (!lote?.mapId) return;
      const estadoRaw = getEstadoFromLote(lote);
      map[lote.mapId] = normalizeEstadoKey(estadoRaw);
    });
    return map;
  }, [lotes]);

  const labelByMapId = useMemo(() => {
    const map = {};
    if (!lotes?.length) return map;
    lotes.forEach((lote) => {
      if (!lote?.mapId || lote?.numero == null) return;
      map[lote.mapId] = String(lote.numero);
    });
    return map;
  }, [lotes]);

  const allActiveMapIds = useMemo(() => {
    if (!lotes?.length) return [];
    return lotes.filter(l => l?.mapId).map(l => l.mapId);
  }, [lotes]);

  return {
    variantByMapId,
    estadoByMapId,
    labelByMapId,
    allActiveMapIds
  };
}
