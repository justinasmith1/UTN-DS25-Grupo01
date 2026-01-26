import React, { useMemo, useEffect, useState } from 'react';
import TablaBase from '../TablaBase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { canDashboardAction } from '../../../lib/auth/rbac.ui';
import { Eye, Edit, Trash2, FileText, RotateCcw, Map as MapIcon } from 'lucide-react';
import { canEditByEstadoOperativo, isEliminado, canDeleteVenta, getVentaDeleteTooltip, canSelectForMap } from '../../../utils/estadoOperativo';
import { useMapaSeleccion } from '../../../hooks/useMapaSeleccion';
import { useMapaVistaControl } from '../../../hooks/useMapaVistaControl';
import MapaPreviewModal from '../../Mapa/MapaPreviewModal';
import { usePrepareMapaData } from '../../../utils/mapaDataHelper';

import { fmtMoney, fmtEstado } from './utils/formatters';
import { ventasTablePreset as tablePreset } from './presets/ventas.table.jsx';
import StatusBadge from './cells/StatusBadge.jsx';
import { getLoteIdFormatted } from '../TablaLotes/utils/getters';
import './TablaVentas.css';

// Persistencia de columnas por usuario
const STORAGE_VERSION = 'v2';
const APP_NS = 'lfed';
const makeColsKey = (userKey) =>
  `${APP_NS}:tabla-ventas-cols:${STORAGE_VERSION}:${userKey}`;

export default function TablaVentas({
  // ⬇️ IMPORTANTE: agregamos "rows" (filas ya filtradas)
  rows,            // <- NUEVO: si viene, se usa como fuente principal (aunque esté vacío)
  ventas,
  data,
  lotes = [],      // <- NUEVO: lotes para obtener mapIds
  onVer,
  onEditar,
  onEliminar,
  onReactivar, // <- NUEVO
  onVerDocumentos,
  onAgregarVenta,
  selectedIds = [],
  onSelectedChange,
  roleOverride,
  userKey,
  // filtro de vista (para deshabilitar selección en vista Eliminadas)
  estadoOperativoFilter,
}) {
  // Normalizamos la fuente de datos
  // CAMBIO: priorizamos "rows" si es un array (incluso si length === 0)
  const source = useMemo(() => {
    if (Array.isArray(rows)) return rows;
    if (Array.isArray(ventas) && ventas.length) return ventas;
    if (Array.isArray(data) && data.length) return data;
    return Array.isArray(ventas) ? ventas : Array.isArray(data) ? data : [];
  }, [rows, ventas, data]);

  // Rol (manteniendo el esquema previo)
  const auth = (() => {
    try {
      return useAuth?.() || {};
    } catch {
      return {};
    }
  })();
  const role = (roleOverride || auth?.user?.role || auth?.role || 'admin')
    .toString()
    .toLowerCase();

  // Clave para persistir columnas por usuario/rol
  const effectiveUserKey = useMemo(() => {
    if (userKey) return userKey;
    try {
      const raw = localStorage.getItem('auth:user');
      const u = raw ? JSON.parse(raw) : null;
      const id = u?.id || u?.email || u?.username || 'anon';
      return `${id}:${role || 'norole'}`;
    } catch {
      return `anon:${role || 'norole'}`;
    }
  }, [userKey, role]);

  const lotesById = useMemo(() => {
    const map = {};
    lotes.forEach((l) => {
      if (l?.id != null) map[String(l.id)] = l;
    });
    return map;
  }, [lotes]);

  // Helpers inyectados al preset (celdas/formatters/getters)
  const helpers = useMemo(
    () => ({
      cells: {
        estadoBadge: (estado) => <StatusBadge value={estado} />,
      },
      fmt: { fmtMoney, fmtEstado },

      // Getters exactos según payload actual
      getters: {
        // Comprador: { comprador: { nombre, apellido } }
        getCompradorNombre: (v) => {
          const n = v?.comprador?.nombre && String(v.comprador.nombre).trim();
          const a =
            v?.comprador?.apellido && String(v.comprador.apellido).trim();
          const full = [n, a].filter(Boolean).join(' ');
          return full || '—';
        },

        // Inmobiliaria: hasta que el back envíe { inmobiliaria: { nombre } },
        // no mostramos el id en UI; devolvemos '—'.
        getInmobiliariaNombre: (v) => {
          const embedded =
            v?.inmobiliaria?.nombre || v?.inmobiliaria?.razonSocial;
          return (embedded && String(embedded).trim()) || '—';
        },
        getLoteMapId: (v) => {
            // Intentar obtener el lote completo
            let lote = v?.lote;
            if (!lote) {
                const lookupId = v?.loteId ?? v?.lotId ?? null;
                if (lookupId != null && lotesById[String(lookupId)]) {
                    lote = lotesById[String(lookupId)];
                }
            }
            // Si tenemos lote, usamos el formateador oficial
            if (lote) {
                return getLoteIdFormatted(lote);
            }
            // Fallbacks si no hay objeto lote completo pero hay mapId suelto
            if (v?.lotMapId) return v.lotMapId;
             
            return '—';
        },
      },
    }),
    [lotesById]
  );

  // Columnas desde preset
  const ALL_COLUMNS = useMemo(
    () => tablePreset.makeColumns(helpers),
    [helpers]
  );
  const ALL_SAFE = useMemo(
    () => [...new Map(ALL_COLUMNS.map((c) => [c.id, c])).values()],
    [ALL_COLUMNS]
  );

  // Plantillas por rol
  const getDefaultColsForRole = (r) => {
    const key = (r || '').toLowerCase();
    const tpl =
      tablePreset.COLUMN_TEMPLATES_BY_ROLE[key] ||
      tablePreset.COLUMN_TEMPLATES_BY_ROLE.admin;
    return tpl.filter((id) => ALL_SAFE.some((c) => c.id === id));
  };

  // Columnas visibles
  const baseDefaultCols = useMemo(
    () => getDefaultColsForRole(role),
    [role, ALL_SAFE]
  );
  const MAX_VISIBLE = Math.max(5, baseDefaultCols.length);
  const [colIds, setColIds] = useState(() => baseDefaultCols);

  useEffect(() => {
    const key = makeColsKey(effectiveUserKey);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          const valid = parsed.filter((id) =>
            ALL_SAFE.some((c) => c.id === id)
          );
          setColIds(valid.length ? valid : baseDefaultCols);
          return;
        }
      }
      setColIds(baseDefaultCols);
    } catch {
      setColIds(baseDefaultCols);
    }
  }, [effectiveUserKey, baseDefaultCols, ALL_SAFE]);

  useEffect(() => {
    const key = makeColsKey(effectiveUserKey);
    try {
      localStorage.setItem(key, JSON.stringify(colIds));
    } catch {}
  }, [colIds, effectiveUserKey]);

  const visibleCols = useMemo(() => {
    const map = new Map();
    colIds.forEach((id) => {
      if (!map.has(id)) {
        const def = ALL_SAFE.find((c) => c.id === id);
        if (def) map.set(id, def);
      }
    });
    return Array.from(map.values());
  }, [colIds, ALL_SAFE]);

  // Permisos de acciones
  const can = (key) => {
    switch (key) {
      case 'ver':
        return canDashboardAction(auth?.user, 'visualizarVenta');
      case 'editar':
        return canDashboardAction(auth?.user, 'editarVenta');
      case 'eliminar':
        return canDashboardAction(auth?.user, 'eliminarVenta');
      case 'documentos':
        return canDashboardAction(auth?.user, 'verDocumentos');
      default:
        return false;
    }
  };

  const renderRowActions = (venta) => {
    const estaEliminada = isEliminado(venta);
    const puedeEditar = canEditByEstadoOperativo(venta);
    const puedeEliminar = canDeleteVenta(venta);
    const tooltipEliminar = getVentaDeleteTooltip(venta);
    
    if (estaEliminada) {
      return (
        <div className="tl-actions">
          {can('ver') && (
            <button
              className="tl-icon tl-icon--view"
              aria-label="Ver Venta"
              data-tooltip="Ver Venta"
              onClick={() => onVer?.(venta)}
            >
              <Eye size={18} strokeWidth={2} />
            </button>
          )}
          {onReactivar && (
            <button
              className="tl-icon tl-icon--success"
              aria-label="Reactivar Venta"
              data-tooltip="Reactivar Venta"
              onClick={() => onReactivar?.(venta)}
            >
              <RotateCcw size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      );
    }
    
    return (
    <div className="tl-actions">
      {can('ver') && (
        <button
          className="tl-icon tl-icon--view"
          aria-label="Ver Venta"
          data-tooltip="Ver Venta"
          onClick={() => onVer?.(venta)}
        >
          <Eye size={18} strokeWidth={2} />
        </button>
      )}
      {/* Editar: solo si puede editar (es operativa) */}
      {can('editar') && puedeEditar && (
        <button
          className="tl-icon tl-icon--edit"
          aria-label="Editar Venta"
          data-tooltip="Editar Venta"
          onClick={() => onEditar?.(venta)}
        >
          <Edit size={18} strokeWidth={2} />
        </button>
      )}
      {can('documentos') && (
        <button
          className="tl-icon tl-icon--docs"
          aria-label="Ver Documentos"
          data-tooltip="Ver Documentos"
          onClick={() => onVerDocumentos?.(venta)}
        >
          <FileText size={18} strokeWidth={2} />
        </button>
      )}
      {can('eliminar') && (
        <button 
          className={`tl-icon tl-icon--delete ${!puedeEliminar ? 'disabled' : ''}`}
          aria-label="Eliminar Venta" 
          data-tooltip={puedeEliminar ? "Eliminar Venta" : tooltipEliminar}
          disabled={!puedeEliminar}
          onClick={() => puedeEliminar && onEliminar?.(venta)}
          style={!puedeEliminar ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );
};

  // Hook para "Ver en mapa" con selección múltiple
  const mapaSeleccion = useMapaSeleccion({
    rows: source,
    selectedIds,
    getLoteData: (venta, lotesIdx) => {
      // Obtener datos del lote desde la venta
      const loteId = venta.loteId || venta.lotId || venta.lote?.id;
      if (!loteId) return null;
      
      const lote = venta.lote || (lotesIdx ? lotesIdx[String(loteId)] : null);
      const mapId = lote?.mapId;
      
      if (!mapId) return null;
      
      return { loteId, mapId };
    },
    getMetadata: (venta, loteData) => {
      // Metadata específica de ventas para mostrar en el mapa
      return {
        type: 'venta',
        ventaId: venta.id,
        numero: venta.numero,
        estado: venta.estado,
        comprador: venta.comprador ? `${venta.comprador.nombre} ${venta.comprador.apellido}` : '—',
        inmobiliaria: venta.inmobiliaria?.nombre || 'La Federala',
        fechaCreacion: venta.createdAt,
        montoTotal: venta.montoTotal,
      };
    },
    lotesIndex: lotesById,
    source: 'ventas'
  });

  // Hook para controlar selección y "Ver en mapa" según vista (Operativas/Eliminadas)
  const mapaControl = useMapaVistaControl({
    rows: source,
    selectedIds,
    onSelectedChange,
    estadoOperativoFilter
  });

  // Preparar datos para el mapa en preview
  const { variantByMapId, estadoByMapId, labelByMapId, allActiveMapIds } = usePrepareMapaData(lotes);

  const toolbarRight = (
    <div className="tl-actions-right">
      <button
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={mapaControl.isVerEnMapaDisabled}
        onClick={mapaSeleccion.openPreview}
        title={mapaControl.isVerEnMapaDisabled ? mapaControl.disabledTooltip : "Ver lotes seleccionados en el mapa"}
        data-tooltip={mapaControl.isVerEnMapaDisabled ? mapaControl.disabledTooltip : undefined}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <MapIcon size={16} />
          <span>Ver en mapa ({mapaControl.selectedOperativasCount})</span>
        </span>
      </button>
      <button
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={selectedIds.length === 0}
        onClick={() => onSelectedChange?.([])}
      >
        Limpiar selección
      </button>
      {String(role).includes('admin') && (
        <button
          type="button"
          className="tl-btn tl-btn--soft"
          onClick={() => onAgregarVenta?.()}
        >
         + Registrar venta
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

      <div className="tabla-ventas">
        <TablaBase
          rows={source}
          rowKey="id"
          columns={ALL_SAFE}
          widthFor={tablePreset.widthFor}
          defaultVisibleIds={baseDefaultCols}
          maxVisible={MAX_VISIBLE}
          renderRowActions={renderRowActions}
          toolbarRight={toolbarRight}
          defaultPageSize={25}
          selected={selectedIds}
          onSelectedChange={onSelectedChange}
          isSelectionDisabled={mapaControl.isVistaEliminadas}
          isRowSelectable={(row) => canSelectForMap(row)}
          disabledSelectionTooltip={mapaControl.disabledTooltip}
          visibleIds={colIds}
          onVisibleIdsChange={setColIds}
        />
      </div>
    </>
  );
}
