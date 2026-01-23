// src/components/Table/TablaReservas/TablaReservas.jsx
// -----------------------------------------------------------------------------
// Tabla de Reservas
// Cambios en esta versión:
// - Columna "Estado" agregada entre Lote y Cliente (con badge).
// - "Precio Lote" deja de ser visible por defecto (sigue disponible en picker).
// - defaultVisibleIds ahora incluye "estado" y excluye "lotePrecio".
// - Se mantienen 7 columnas máximas visibles simultáneamente.
// -----------------------------------------------------------------------------

import React, { useMemo } from 'react';
import TablaBase from '../TablaBase';

import { useAuth } from '../../../app/providers/AuthProvider';
import { canDashboardAction } from '../../../lib/auth/rbac.ui';
import { Eye, Edit, Trash2, FileText, RefreshCcw, Map } from 'lucide-react';
import { canEditByEstadoOperativo, isEliminado, canDeleteReserva, getReservaDeleteTooltip } from '../../../utils/estadoOperativo';
import { useMapaSeleccion } from '../../../hooks/useMapaSeleccion';
import MapaPreviewModal from '../../Mapa/MapaPreviewModal';
import { usePrepareMapaData } from '../../../utils/mapaDataHelper';

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

  // Hook para "Ver en mapa" con selección múltiple
  const mapaSeleccion = useMapaSeleccion({
    rows,
    selectedIds,
    getLoteData: (reserva, lotesIdx) => {
      // Obtener datos del lote desde la reserva
      const loteId = reserva.loteId || reserva.lotId || reserva.lote?.id;
      if (!loteId) return null;
      
      const lote = reserva.lote || (lotesIdx ? lotesIdx[String(loteId)] : null);
      const mapId = lote?.mapId;
      
      if (!mapId) return null;
      
      return { loteId, mapId };
    },
    getMetadata: (reserva, loteData) => {
      // Metadata específica de reservas para mostrar en el mapa
      return {
        type: 'reserva',
        reservaId: reserva.id,
        numero: reserva.numero,
        estado: reserva.estado,
        cliente: reserva.cliente ? `${reserva.cliente.nombre} ${reserva.cliente.apellido}` : '—',
        inmobiliaria: reserva.inmobiliaria?.nombre || 'La Federala',
        fechaCreacion: reserva.createdAt,
        montoSeña: reserva.montoSeña,
      };
    },
    lotesIndex: lotesByIdIndex,
    source: 'reservas'
  });

  // Preparar datos para el mapa en preview
  const { variantByMapId, estadoByMapId, labelByMapId, allActiveMapIds } = usePrepareMapaData(lotes);

  // 9) Acciones por fila
  const renderRowActions = (row) => {
    const estaEliminada = isEliminado(row);
    const puedeEditar = canEditByEstadoOperativo(row);
    const puedeEliminar = canDeleteReserva(row);
    const tooltipEliminar = getReservaDeleteTooltip(row);
    
    if (estaEliminada) {
      return (
        <div className="tl-actions">
           {can('visualizarReserva') && (
            <button className="tl-icon tl-icon--view" aria-label="Ver Reserva" data-tooltip="Ver Reserva" onClick={() => onVer?.(row)}>
              <Eye size={18} strokeWidth={2} />
            </button>
          )}
          {onReactivar && (
            <button 
              className="tl-icon tl-icon--success" 
              aria-label="Reactivar Reserva" 
              data-tooltip="Reactivar Reserva" 
              onClick={() => onReactivar?.(row)}
            >
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
      {can('editarReserva') && puedeEditar && (
        <button className="tl-icon tl-icon--edit" aria-label="Editar Reserva" data-tooltip="Editar Reserva" onClick={() => onEditar?.(row)}>
          <Edit size={18} strokeWidth={2} />
        </button>
      )}
      {can('eliminarReserva') && (
        <button 
          className={`tl-icon tl-icon--delete ${!puedeEliminar ? 'disabled' : ''}`}
          aria-label="Eliminar Reserva" 
          data-tooltip={puedeEliminar ? "Eliminar Reserva" : tooltipEliminar}
          disabled={!puedeEliminar}
          onClick={() => puedeEliminar && onEliminar?.(row)}
          style={!puedeEliminar ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
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
        disabled={mapaSeleccion.selectedCount === 0}
        onClick={mapaSeleccion.openPreview}
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
