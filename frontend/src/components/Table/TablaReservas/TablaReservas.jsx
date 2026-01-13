// src/components/Table/TablaReservas/TablaReservas.jsx
// -----------------------------------------------------------------------------
// Tabla de Reservas
// Cambios en esta versión:
// - Columna "Estado" agregada entre Lote y Cliente (con badge).
// - "Precio Lote" deja de ser visible por defecto (sigue disponible en picker).
// - defaultVisibleIds ahora incluye "estado" y excluye "lotePrecio".
// - Se mantienen 7 columnas máximas visibles simultáneamente.
// -----------------------------------------------------------------------------

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TablaBase from '../TablaBase';

import { useAuth } from '../../../app/providers/AuthProvider';
import { canDashboardAction } from '../../../lib/auth/rbac.ui';
import { Eye, Edit, Trash2, FileText, X, RefreshCcw } from 'lucide-react';
import MapaInteractivo from '../../Mapa/MapaInteractivo';
import {
  normalizeEstadoKey,
  getEstadoVariant,
  getEstadoFromLote,
} from '../../../utils/mapaUtils';

import { reservasTablePreset as tablePreset } from './presets/reservas.table.jsx';
import StatusBadge from './cells/StatusBadge.jsx';
import './TablaReservas.css'; 

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

function resolveClienteNombre(cli) {
  if (!cli) return null;
  const full = cli.fullName || cli.nombreCompleto || cli.displayName;
  if (full) return String(full);
  const nombre = cli.nombre || cli.firstName || cli.nombres;
  const apellido = cli.apellido || cli.lastName || cli.apellidos;
  const res = [nombre, apellido].filter(Boolean).join(' ').trim();
  return res || null;
}

function resolveInmobiliariaNombre(inmo) {
  if (!inmo) return null;
  return (
    inmo.nombre ||
    inmo.name ||
    inmo.razonSocial ||
    inmo.razon_social ||
    null
  );
}

function resolveLotePrecio(lote) {
  if (!lote) return null;
  return (
    lote.precioLote ??
    lote.precio ??
    lote.precio_publicado ??
    null
  );
}

/**
 * Enriquecemos una fila de reserva con campos planos que el preset ya puede leer:
 * - clienteNombre / inmobiliariaNombre / lotePrecio
 */
function enrichRow(reserva, { clientesById, inmobiliariasById, lotesById }) {
  const r = { ...reserva };

  if (r.clienteId && clientesById?.[r.clienteId]) {
    const cli = clientesById[r.clienteId];
    r.cliente = r.cliente || cli;
    r.clienteNombre = r.clienteNombre || resolveClienteNombre(cli);
  }

  if (r.inmobiliariaId && inmobiliariasById?.[r.inmobiliariaId]) {
    const inmo = inmobiliariasById[r.inmobiliariaId];
    r.inmobiliaria = r.inmobiliaria || inmo;
    r.inmobiliariaNombre = r.inmobiliariaNombre || resolveInmobiliariaNombre(inmo);
  }

  if (r.loteId && lotesById?.[r.loteId]) {
    const lote = lotesById[r.loteId];
    r.lote = r.lote || { id: lote.id };
    const precio = resolveLotePrecio(lote);
    if (precio != null) r.lotePrecio = precio;
  }

  return r;
}

export default function TablaReservas({
  reservas,
  data,

  // lookups opcionales
  clientes, inmobiliarias, lotes = [],
  clientesById, inmobiliariasById, lotesById,
  lookups,

  // callbacks
  onVer, onEditar, onEliminar, onVerDocumentos, onAgregarReserva, onReactivar,

  // selección
  selectedIds = [], onSelectedChange,

  roleOverride,
}) {
  // 1) Normalizamos fuente
  const source = useMemo(() => {
    if (Array.isArray(reservas) && reservas.length) return reservas;
    if (Array.isArray(data) && data.length) return data;
    return Array.isArray(reservas) ? reservas : Array.isArray(data) ? data : [];
  }, [reservas, data]);

  // 2) Índices
  const idxClientes = useMemo(() => {
    if (clientesById) return clientesById;
    if (lookups?.clientesById) return lookups.clientesById;
    return buildIndex(clientes, 'id');
  }, [clientesById, lookups, clientes]);

  const idxInmobs = useMemo(() => {
    if (inmobiliariasById) return inmobiliariasById;
    if (lookups?.inmobiliariasById) return lookups.inmobiliariasById;
    return buildIndex(inmobiliarias, 'id');
  }, [inmobiliariasById, lookups, inmobiliarias]);

  const idxLotes = useMemo(() => {
    if (lotesById) return lotesById;
    if (lookups?.lotesById) return lookups.lotesById;
    return buildIndex(lotes, 'id');
  }, [lotesById, lookups, lotes]);

  // 3) Enriquecemos filas
  const rows = useMemo(() => {
    if (!source?.length) return [];
    const ctx = { clientesById: idxClientes, inmobiliariasById: idxInmobs, lotesById: idxLotes };
    return source.map((r) => enrichRow(r, ctx));
  }, [source, idxClientes, idxInmobs, idxLotes]);

  // 4) Auth / RBAC
  let authUser = null;
  try {
    const auth = useAuth?.();
    authUser = auth?.user || null;
  } catch {
    authUser = null;
  }
  const can = (perm) => canDashboardAction?.(authUser, perm) === true;

  // 5) Columns base del preset + inserción de "Estado" entre "Lote" y "Cliente"
  const columnsWithEstado = useMemo(() => {
    const cols = [...tablePreset.columns];
    const estadoCol = {
      id: 'estado',
      titulo: 'Estado',
      accessorKey: 'estado',
      width: '130px',  // Reducido de 140px
      align: 'center',
      cell: ({ getValue, row }) => {
        const v = getValue?.() ?? row?.original?.estado ?? null;
        return <StatusBadge value={v} />;
     },
    };


    // Busco "Lote" por id (en el preset suele ser 'loteInfo' o similar)
    const loteIdx = cols.findIndex(c => c.id === 'loteInfo' || c.titulo === 'Lote' || c.accessorKey === 'lote');
    const insertAt = loteIdx >= 0 ? loteIdx + 1 : 2; // fallback razonable
    cols.splice(insertAt, 0, estadoCol);

    return cols;
  }, []);

  // 6) Visibles por defecto (7): id, lote, estado, cliente, fecha, inmobiliaria, plazo
  const defaultVisibleIds = useMemo(() => {
    // resuelve los ids efectivos en tu preset
    const idId = 'id';
    const loteId = columnsWithEstado.find(c => c.id === 'loteInfo' || c.titulo === 'Lote')?.id ?? 'loteInfo';
    const clienteId = columnsWithEstado.find(c => c.id === 'clienteCompleto' || c.titulo === 'Cliente')?.id ?? 'clienteCompleto';
    const fechaId = columnsWithEstado.find(c => c.id === 'fechaReserva' || c.titulo === 'Fecha Reserva')?.id ?? 'fechaReserva';
    const inmoId = columnsWithEstado.find(c => c.id === 'inmobiliariaNombre' || c.titulo === 'Inmobiliaria')?.id ?? 'inmobiliariaNombre';
    const plazoId = columnsWithEstado.find(c => c.id === 'fechaFinReserva' || c.titulo === 'Plazo Reserva')?.id ?? 'fechaFinReserva';

    return [idId, loteId, 'estado', clienteId, fechaId, inmoId, plazoId]; // 7 exactas, Seña queda deseleccionada
  }, [columnsWithEstado]);

  // 7) Alineación global para esta tabla (no tocamos preset/TablaBase)
  const FORCE_ALIGN = 'center'; // cambiar a 'left' si querés todo a la izquierda
  const columnsAligned = useMemo(
    () => columnsWithEstado.map((c) => ({ ...c, align: FORCE_ALIGN })),
    [columnsWithEstado]
  );

  // ===== preview del mapa  =====
  const [selectedMapIdsForPreview, setSelectedMapIdsForPreview] = useState([]);
  const navigate = useNavigate();

  // Índice de lotes por id para búsqueda rápida
  const lotesByIdIndex = useMemo(() => {
    const map = {};
    lotes.forEach((l) => {
      if (l?.id != null) map[String(l.id)] = l;
    });
    // También usar lotesById si viene como prop
    if (lotesById) {
      Object.keys(lotesById).forEach((id) => {
        if (!map[id]) map[id] = lotesById[id];
      });
    }
    return map;
  }, [lotes, lotesById]);

  // Obtener mapIds de las reservas seleccionadas
  const handleVerEnMapa = () => {
    if (selectedIds.length === 0) return;
    
    const selectedReservas = rows.filter((r) => {
      return selectedIds.includes(String(r.id));
    });
    
    const mapIds = selectedReservas
      .map((r) => {
        // Intentar obtener mapId desde reserva.lote?.mapId o buscar en lotesByIdIndex
        const loteId = r.loteId || r.lotId || r.lote?.id;
        if (r.lote?.mapId) return r.lote.mapId;
        if (loteId && lotesByIdIndex[String(loteId)]) {
          return lotesByIdIndex[String(loteId)].mapId;
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

  // 9) Acciones por fila
  const renderRowActions = (row) => {
    const isEliminado = row?.estado === 'ELIMINADO' || row?.estado === 'eliminado';
    
    if (isEliminado) {
      return (
        <div className="tl-actions">
           {can('visualizarReserva') && (
            <button className="tl-icon tl-icon--view" aria-label="Ver Reserva" data-tooltip="Ver Reserva" onClick={() => onVer?.(row)}>
              <Eye size={18} strokeWidth={2} />
            </button>
          )}
          {onReactivar && (
             <button className="tl-icon tl-icon--success" aria-label="Reactivar Reserva" data-tooltip="Reactivar Reserva" onClick={() => onReactivar?.(row)}>
               <RefreshCcw size={18} strokeWidth={2} />
             </button>
          )}
        </div>
      );
    }

    return (
    <div className="tl-actions">
      {can('visualizarReserva') && (
        <button className="tl-icon tl-icon--view" aria-label="Ver Reserva" data-tooltip="Ver Reserva" onClick={() => onVer?.(row)}>
          <Eye size={18} strokeWidth={2} />
        </button>
      )}
      {can('editarReserva') && (
        <button className="tl-icon tl-icon--edit" aria-label="Editar Reserva" data-tooltip="Editar Reserva" onClick={() => onEditar?.(row)}>
          <Edit size={18} strokeWidth={2} />
        </button>
      )}
      {can('eliminarReserva') && (
        <button className="tl-icon tl-icon--delete" aria-label="Eliminar Reserva" data-tooltip="Eliminar Reserva" onClick={() => onEliminar?.(row)}>
          <Trash2 size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );
};

  // 8) Toolbar derecha
  const toolbarRight = (
    <div className="tl-actions-right">
      <button
        type="button"
        className="tl-btn tl-btn--soft"
        title="Ver en mapa"
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
        title="Limpiar selección"
      >
        Limpiar selección
      </button>

      {onAgregarReserva && (
        <button
          type="button"
          className="tl-btn tl-btn--soft"
          onClick={() => onAgregarReserva?.()}
        >
          + Registrar Reserva
        </button>
      )}
    </div>
  );

  return (
    <>
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

      <div className="tabla-reservas">
        <TablaBase
          rows={rows}
          rowKey="id"
          columns={columnsAligned}
          widthFor={tablePreset.widthFor}
          defaultVisibleIds={defaultVisibleIds} // 7 por defecto (con "estado")
          maxVisible={7}                        // tope en 7 columnas visibles
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
