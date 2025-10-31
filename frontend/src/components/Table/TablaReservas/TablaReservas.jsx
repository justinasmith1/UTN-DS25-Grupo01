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
import { Eye, Edit, Trash2, FileText } from 'lucide-react';

import { reservasTablePreset as tablePreset } from './presets/reservas.table.jsx';
import StatusBadge from './cells/StatusBadge.jsx'; 

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
  clientes, inmobiliarias, lotes,
  clientesById, inmobiliariasById, lotesById,
  lookups,

  // callbacks
  onVer, onEditar, onEliminar, onVerDocumentos, onAgregarReserva,

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
      width: '140px',
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

  // 6) Visibles por defecto (7): id, lote, estado, cliente, fecha, seña, inmobiliaria
  const defaultVisibleIds = useMemo(() => {
    // resuelve los ids efectivos en tu preset
    const idId = 'id';
    const loteId = columnsWithEstado.find(c => c.id === 'loteInfo' || c.titulo === 'Lote')?.id ?? 'loteInfo';
    const clienteId = columnsWithEstado.find(c => c.id === 'clienteCompleto' || c.titulo === 'Cliente')?.id ?? 'clienteCompleto';
    const fechaId = columnsWithEstado.find(c => c.id === 'fechaReserva' || c.titulo === 'Fecha Reserva')?.id ?? 'fechaReserva';
    const senaId = columnsWithEstado.find(c => c.id === 'seña' || c.titulo === 'Seña')?.id ?? 'seña';
    const inmoId = columnsWithEstado.find(c => c.id === 'inmobiliariaNombre' || c.titulo === 'Inmobiliaria')?.id ?? 'inmobiliariaNombre';

    // 👉 "lotePrecio" y "createdAt" quedan para elegir en el picker
    return [idId, loteId, 'estado', clienteId, fechaId, senaId, inmoId]; // 7 exactas
  }, [columnsWithEstado]);

  // 7) Alineación global para esta tabla (no tocamos preset/TablaBase)
  const FORCE_ALIGN = 'center'; // cambiar a 'left' si querés todo a la izquierda
  const columnsAligned = useMemo(
    () => columnsWithEstado.map((c) => ({ ...c, align: FORCE_ALIGN })),
    [columnsWithEstado]
  );

  // 8) Toolbar derecha
  const toolbarRight = (
    <div className="tl-actions-right">
      <button
        type="button"
        className="tl-btn tl-btn--soft"
        title="Ver en mapa (futuro)"
        disabled={selectedIds.length === 0}
      >
        Ver en mapa (futuro) ({selectedIds.length})
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

  // 9) Acciones por fila
  const renderRowActions = (row) => (
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
      {can('verDocumentos') && (
        <button className="tl-icon tl-icon--docs" aria-label="Ver Documentos" data-tooltip="Ver Documentos" onClick={() => onVerDocumentos?.(row)}>
          <FileText size={18} strokeWidth={2} />
        </button>
      )}
      {can('eliminarReserva') && (
        <button className="tl-icon tl-icon--delete" aria-label="Eliminar Reserva" data-tooltip="Eliminar Reserva" onClick={() => onEliminar?.(row)}>
          <Trash2 size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );

  // 10) Render
  return (
    <TablaBase
      rows={rows}
      rowKey="id"
      columns={columnsAligned}
      widthFor={tablePreset.widthFor}
      defaultVisibleIds={defaultVisibleIds} // 7 por defecto (con "estado")
      maxVisible={7}                        // no permite activar una 8va
      renderRowActions={renderRowActions}
      toolbarRight={toolbarRight}
      defaultPageSize={25}
      selected={selectedIds}
      onSelectedChange={onSelectedChange}
    />
  );
}
