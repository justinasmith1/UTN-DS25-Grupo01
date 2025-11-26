import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TablaBase from '../TablaBase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { canDashboardAction } from '../../../lib/auth/rbac.ui';
import { Eye, Edit, Trash2, FileText, X } from 'lucide-react';
import MapaInteractivo from '../../Mapa/MapaInteractivo';
import {
  normalizeEstadoKey,
  getEstadoVariant,
  getEstadoFromLote,
} from '../../../utils/mapaUtils';

import { fmtMoney, fmtEstado } from './utils/formatters';
import { ventasTablePreset as tablePreset } from './presets/ventas.table.jsx';

import StatusBadge from './cells/StatusBadge.jsx';

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
  onVerDocumentos,
  onAgregarVenta,
  selectedIds = [],
  onSelectedChange,
  roleOverride,
  userKey,
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
      },
    }),
    []
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

  const renderRowActions = (venta) => (
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
      {can('editar') && (
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
          className="tl-icon tl-icon--delete"
          aria-label="Eliminar Venta"
          data-tooltip="Eliminar Venta"
          onClick={() => onEliminar?.(venta)}
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );

  // ===== preview del mapa  =====
  const [selectedMapIdsForPreview, setSelectedMapIdsForPreview] = useState([]);
  const navigate = useNavigate();

  // Índice de lotes por id para búsqueda rápida
  const lotesById = useMemo(() => {
    const map = {};
    lotes.forEach((l) => {
      if (l?.id != null) map[String(l.id)] = l;
    });
    return map;
  }, [lotes]);

  // Obtener mapIds de las ventas seleccionadas
  const handleVerEnMapa = () => {
    if (selectedIds.length === 0) return;
    
    const selectedVentas = source.filter((v) => {
      return selectedIds.includes(String(v.id));
    });
    
    const mapIds = selectedVentas
      .map((v) => {
        // Intentar obtener mapId desde venta.lote?.mapId o buscar en lotesById
        const loteId = v.loteId || v.lotId || v.lote?.id;
        if (v.lote?.mapId) return v.lote.mapId;
        if (loteId && lotesById[String(loteId)]) {
          return lotesById[String(loteId)].mapId;
        }
        return null;
      })
      .filter(Boolean);
    
    if (mapIds.length > 0) {
      setSelectedMapIdsForPreview(mapIds);
    }
  };

  const handleCerrarPreview = () => {
    setSelectedMapIdsForPreview([]);
  };

  const handleVerMapaCompleto = () => {
    if (selectedMapIdsForPreview.length === 0) return;
    // Navegar al mapa sin tocar filtros, solo pasando los mapIds para resaltar
    const params = new URLSearchParams();
    params.set('selectedMapIds', selectedMapIdsForPreview.join(','));
    navigate(`/map?${params.toString()}`);
  };

  // Preparar datos para el mapa en preview (usar todos los lotes disponibles)
  const variantByMapId = useMemo(() => {
    const map = {};
    lotes.forEach((lote) => {
      if (!lote?.mapId) return;
      const estadoRaw = getEstadoFromLote(lote);
      map[lote.mapId] = getEstadoVariant(estadoRaw);
    });
    return map;
  }, [lotes]);

  const estadoByMapId = useMemo(() => {
    const map = {};
    lotes.forEach((lote) => {
      if (!lote?.mapId) return;
      const estadoRaw = getEstadoFromLote(lote);
      map[lote.mapId] = normalizeEstadoKey(estadoRaw);
    });
    return map;
  }, [lotes]);

  const labelByMapId = useMemo(() => {
    const map = {};
    lotes.forEach((lote) => {
      if (!lote?.mapId || lote?.numero == null) return;
      map[lote.mapId] = String(lote.numero);
    });
    return map;
  }, [lotes]);

  // En modo preview, todos los lotes deben ser activos para verse con su color normal
  const allActiveMapIds = useMemo(() => {
    return lotes.map((l) => l.mapId).filter(Boolean);
  }, [lotes]);

  const toolbarRight = (
    <div className="tl-actions-right">
      <button
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={selectedIds.length === 0}
        onClick={handleVerEnMapa}
      >
        Ver en mapa ({selectedIds.length})
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
          + Agregar Venta
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Preview del mapa - card flotante */}
      {selectedMapIdsForPreview.length > 0 && (
        <>
          {/* Backdrop muy sutil */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.12)',
              zIndex: 1999
            }}
            onClick={handleCerrarPreview}
          />
          {/* Card */}
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
              Vista previa del mapa ({selectedMapIdsForPreview.length} {selectedMapIdsForPreview.length === 1 ? 'lote' : 'lotes'})
            </h4>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="tl-btn tl-btn--soft"
                onClick={handleVerMapaCompleto}
                style={{ fontSize: '0.875rem', padding: '6px 16px' }}
              >
                Ver mapa completo
              </button>
              <button
                type="button"
                className="tl-btn tl-btn--ghost"
                onClick={handleCerrarPreview}
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
              selectedMapIds={selectedMapIdsForPreview}
              variantByMapId={variantByMapId}
              activeMapIds={allActiveMapIds}
              labelByMapId={labelByMapId}
              estadoByMapId={estadoByMapId}
            />
          </div>
        </div>
        </>
      )}

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
        visibleIds={colIds}
        onVisibleIdsChange={setColIds}
      />
    </>
  );
}
