// src/components/Table/TablaPrioridades/TablaPrioridades.jsx
// Tabla de Prioridades

import React, { useMemo } from 'react';
import TablaBase from '../TablaBase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { canDashboardAction } from '../../../lib/auth/rbac.ui';
import { Eye, Edit, Trash2, RotateCcw, Map } from 'lucide-react';
import { prioridadesTablePreset as tablePreset } from './presets/prioridades.table.jsx';
import StatusBadge from './cells/StatusBadge.jsx';
import { canEditByEstadoOperativo, isEliminado } from '../../../utils/estadoOperativo';
import { useMapaSeleccion } from '../../../hooks/useMapaSeleccion';
import MapaPreviewModal from '../../Mapa/MapaPreviewModal';
import { usePrepareMapaData } from '../../../utils/mapaDataHelper';

// ------------------------
// Helpers internos
// ------------------------
function buildIndex(arr, key = 'id') {
  if (!Array.isArray(arr)) return null;
  const out = Object.create(null);
  for (const it of arr) {
    const k = it?.[key];
    if (k != null) out[k] = it;
  }
  return out;
}

export default function TablaPrioridades({
  prioridades,
  data,

  // lookups opcionales
  lotes = [],
  inmobiliarias = [],
  lotesById,
  inmobiliariasById,
  lookups,

  // callbacks
  onVer,
  onEditar,
  onEliminar,
  onReactivar,
  onAgregarPrioridad,

  // selección
  selectedIds = [],
  onSelectedChange,

  roleOverride,
}) {
  // 1) Normalizamos fuente
  const source = useMemo(() => {
    if (Array.isArray(prioridades) && prioridades.length) return prioridades;
    if (Array.isArray(data) && data.length) return data;
    return Array.isArray(prioridades) ? prioridades : Array.isArray(data) ? data : [];
  }, [prioridades, data]);

  // 2) Índices
  const idxLotes = useMemo(() => {
    if (lotesById) return lotesById;
    if (lookups?.lotesById) return lookups.lotesById;
    return buildIndex(lotes, 'id');
  }, [lotesById, lookups, lotes]);

  const idxInmobs = useMemo(() => {
    if (inmobiliariasById) return inmobiliariasById;
    if (lookups?.inmobiliariasById) return lookups.inmobiliariasById;
    return buildIndex(inmobiliarias, 'id');
  }, [inmobiliariasById, lookups, inmobiliarias]);

  // 3) Enriquecemos filas (si es necesario)
  const rows = useMemo(() => {
    if (!source?.length) return [];
    // Por ahora no necesitamos enriquecimiento, pero podemos agregarlo si hace falta
    return source.map((p) => {
      const row = { ...p };
      // Si no tiene lote completo pero sí loteId, intentar obtenerlo
      if (!row.lote && row.loteId && idxLotes?.[String(row.loteId)]) {
        row.lote = idxLotes[String(row.loteId)];
      }
      // Si no tiene inmobiliaria completa pero sí inmobiliariaId, intentar obtenerla
      if (!row.inmobiliaria && row.inmobiliariaId && idxInmobs?.[String(row.inmobiliariaId)]) {
        row.inmobiliaria = idxInmobs[String(row.inmobiliariaId)];
      }
      return row;
    });
  }, [source, idxLotes, idxInmobs]);

  // 4) Auth / RBAC
  let authUser = null;
  try {
    const auth = useAuth?.();
    authUser = auth?.user || null;
  } catch {
    authUser = null;
  }
  const can = (perm) => canDashboardAction?.(authUser, perm) === true;

  // 5) Columns base del preset + reemplazo de "Estado" con badge
  const columnsWithEstado = useMemo(() => {
    const cols = [...tablePreset.columns];
    
    // Reemplazar columna estado existente con badge
    const estadoIdx = cols.findIndex(c => c.id === 'estado');
    if (estadoIdx >= 0) {
      cols[estadoIdx] = {
        ...cols[estadoIdx],
        accessorKey: 'estado',
        cell: ({ getValue, row }) => {
          const v = getValue?.() ?? row?.original?.estado ?? null;
          return <StatusBadge value={v} />;
        },
      };
    }
    
    return cols;
  }, []);

  // 6) Visibles por defecto: numero, lote, estado, owner, fechaInicio, fechaFin
  const defaultVisibleIds = useMemo(() => {
    return ['numero', 'lote', 'estado', 'owner', 'fechaInicio', 'fechaFin'];
  }, []);

  // 7) Alineación global
  const FORCE_ALIGN = 'center';
  const columnsAligned = useMemo(
    () => columnsWithEstado.map((c) => ({ ...c, align: FORCE_ALIGN })),
    [columnsWithEstado]
  );

  // 8) Hook para "Ver en mapa" con selección múltiple
  const mapaSeleccion = useMapaSeleccion({
    rows,
    selectedIds,
    getLoteData: (prioridad, lotesIdx) => {
      // Obtener datos del lote desde la prioridad
      const loteId = prioridad.loteId || prioridad.lotId || prioridad.lote?.id;
      if (!loteId) return null;
      
      const lote = prioridad.lote || (lotesIdx ? lotesIdx[String(loteId)] : null);
      const mapId = lote?.mapId;
      
      if (!mapId) return null;
      
      return { loteId, mapId };
    },
    getMetadata: (prioridad, loteData) => {
      // Metadata específica de prioridades para mostrar en el mapa
      return {
        type: 'prioridad',
        prioridadId: prioridad.id,
        numero: prioridad.numero,
        estado: prioridad.estado,
        inmobiliaria: prioridad.inmobiliaria?.nombre || prioridad.ownerType === 'CCLF' ? 'La Federala' : '—',
        fechaInicio: prioridad.fechaInicio,
        fechaFin: prioridad.fechaFin,
        ownerType: prioridad.ownerType,
      };
    },
    lotesIndex: idxLotes,
    source: 'prioridades'
  });

  // Preparar datos para el mapa en preview
  const { variantByMapId, estadoByMapId, labelByMapId, allActiveMapIds } = usePrepareMapaData(lotes);

  // 9) Acciones por fila
  const renderRowActions = (row) => {
    const estado = String(row?.estado ?? "").toUpperCase();
    const isActiva = estado === "ACTIVA";
    const estaEliminada = isEliminado(row);
    const puedeEditar = canEditByEstadoOperativo(row);

    return (
      <div className="tl-actions">
        {can('visualizarPrioridad') && (
          <button
            className="tl-icon tl-icon--view"
            aria-label="Ver Prioridad"
            data-tooltip="Ver Prioridad"
            onClick={() => onVer?.(row)}
          >
            <Eye size={18} strokeWidth={2} />
          </button>
        )}
        {can('editarPrioridad') && puedeEditar && (
          <button
            className="tl-icon tl-icon--edit"
            aria-label="Editar Prioridad"
            data-tooltip="Editar Prioridad"
            onClick={() => onEditar?.(row)}
          >
            <Edit size={18} strokeWidth={2} />
          </button>
        )}
        {can('eliminarPrioridad') && (
          estaEliminada ? (
            // Prioridad eliminada: mostrar botón reactivar
            <button
              className="tl-icon tl-icon--success"
              aria-label="Reactivar Prioridad"
              data-tooltip="Reactivar Prioridad"
              onClick={() => onReactivar?.(row)}
            >
              <RotateCcw size={18} strokeWidth={2} />
            </button>
          ) : (
            // Prioridad operativa: mostrar botón eliminar (solo si no está ACTIVA)
            <button
              className="tl-icon tl-icon--delete"
              aria-label={isActiva ? "No se puede eliminar una prioridad activa" : "Eliminar Prioridad"}
              data-tooltip={isActiva ? "Primero cancelar o finalizar" : "Eliminar Prioridad"}
              onClick={() => !isActiva && onEliminar?.(row)}
              disabled={isActiva}
              style={isActiva ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <Trash2 size={18} strokeWidth={2} />
            </button>
          )
        )}
      </div>
    );
  };

  // 10) Toolbar derecha con botón "Ver en mapa"
  const toolbarRight = (
    <div className="tl-actions-right">
      <button
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={mapaSeleccion.selectedCount === 0}
        onClick={mapaSeleccion.openPreview}
        title="Ver lotes seleccionados en el mapa"
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Map size={16} />
          <span>Ver en mapa ({mapaSeleccion.selectedCount})</span>
        </span>
      </button>

      <button
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={selectedIds.length === 0}
        onClick={() => onSelectedChange?.([])}
        title="Limpiar selección"
      >
        Limpiar selección
      </button>

      {onAgregarPrioridad && (
        <button
          type="button"
          className="tl-btn tl-btn--soft"
          onClick={() => onAgregarPrioridad?.()}
        >
          + Agregar Prioridad
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Modal de vista previa del mapa */}
      <MapaPreviewModal
        open={mapaSeleccion.previewOpen}
        onClose={mapaSeleccion.closePreview}
        onVerMapaCompleto={mapaSeleccion.goToMapaCompleto}
        selectedMapIds={mapaSeleccion.previewMapIds}
        variantByMapId={variantByMapId}
        activeMapIds={allActiveMapIds}
        labelByMapId={labelByMapId}
        estadoByMapId={estadoByMapId}
      />

      <div className="tabla-prioridades">
        <TablaBase
          rows={rows}
          rowKey="id"
          columns={columnsAligned}
          widthFor={tablePreset.widthFor}
          defaultVisibleIds={defaultVisibleIds}
          maxVisible={6} // numero, lote, estado, owner, fechaInicio, fechaFin (createdAt opcional)
          renderRowActions={renderRowActions}
          toolbarRight={toolbarRight}
          defaultPageSize={25}
          selected={selectedIds}
          onSelectedChange={onSelectedChange}
        />
      </div>
    </>
  );
}
