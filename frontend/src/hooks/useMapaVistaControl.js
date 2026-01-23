// frontend/src/hooks/useMapaVistaControl.js
// Hook reutilizable para controlar la selección y "Ver en mapa" según la vista (Operativas/Eliminadas)

import { useMemo, useEffect, useCallback } from 'react';
import { canSelectForMap } from '../utils/estadoOperativo';

/**
 * Hook para controlar la selección de filas y el botón "Ver en mapa"
 * según la vista actual (Operativas/Eliminadas)
 * 
 * @param {Object} options
 * @param {Array} options.rows - Filas visibles actuales
 * @param {Array} options.selectedIds - IDs seleccionados
 * @param {Function} options.onSelectedChange - Callback para cambiar selección
 * @param {string} options.estadoOperativoFilter - Filtro actual: "OPERATIVO" o "ELIMINADO"
 * @returns {Object} - Estado y helpers para controlar la selección y "Ver en mapa"
 */
export function useMapaVistaControl({
  rows = [],
  selectedIds = [],
  onSelectedChange,
  estadoOperativoFilter
}) {
  // Determinar si estamos en la vista "Eliminadas"
  const isVistaEliminadas = useMemo(() => {
    return estadoOperativoFilter === 'ELIMINADO';
  }, [estadoOperativoFilter]);

  // Limpiar selección automáticamente al cambiar a vista Eliminadas
  useEffect(() => {
    if (isVistaEliminadas && selectedIds.length > 0) {
      onSelectedChange?.([]);
    }
  }, [isVistaEliminadas, selectedIds.length, onSelectedChange]);

  // Contar cuántas filas seleccionadas son operativas
  const selectedOperativasCount = useMemo(() => {
    if (selectedIds.length === 0) return 0;
    
    return rows.filter((row) => {
      const isSelected = selectedIds.includes(String(row.id));
      return isSelected && canSelectForMap(row);
    }).length;
  }, [rows, selectedIds]);

  // Filtrar las filas seleccionadas para obtener solo las operativas
  const getSelectedOperativasIds = useCallback(() => {
    if (selectedIds.length === 0) return [];
    
    return selectedIds.filter((id) => {
      const row = rows.find(r => String(r.id) === String(id));
      return row && canSelectForMap(row);
    });
  }, [rows, selectedIds]);

  // Determinar si el botón "Ver en mapa" debe estar deshabilitado
  const isVerEnMapaDisabled = useMemo(() => {
    return isVistaEliminadas || selectedOperativasCount === 0;
  }, [isVistaEliminadas, selectedOperativasCount]);

  // Tooltip para elementos disabled
  const disabledTooltip = "No podés ver en el mapa registros eliminados.";

  return {
    isVistaEliminadas,
    selectedOperativasCount,
    isVerEnMapaDisabled,
    disabledTooltip,
    getSelectedOperativasIds,
  };
}
