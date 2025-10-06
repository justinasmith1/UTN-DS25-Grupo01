// src/components/Table/TablaReservas/TablaReservas.jsx
import React, { useMemo, useState, useEffect } from 'react';
import TablaBase from '../TablaBase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { canDashboardAction } from '../../../lib/auth/rbac.ui';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';

// Helpers visuales y de formato
import { fmtMoney, fmtEstado, fmtFecha, fmtClienteCompleto } from './utils/formatters';

// Preset con columnas/anchos/plantillas
import { reservasTablePreset as tablePreset } from './presets/reservas.table.jsx';

// Claves de storage
const STORAGE_VERSION = 'v2';
const APP_NS = 'lfed';
const makeColsKey = (userKey) => `${APP_NS}:tabla-reservas-cols:${STORAGE_VERSION}:${userKey}`;

export default function TablaReservas({
  reservas, data,
  onVer, onEditar, onEliminar, onVerDocumentos, onAgregarReserva,
  selectedIds = [], onSelectedChange,
  roleOverride,
  userKey,
}) {
  // Dataset 
  const source = useMemo(() => {
    if (Array.isArray(reservas) && reservas.length) return reservas;
    if (Array.isArray(data) && data.length) return data;
    return Array.isArray(reservas) ? reservas : Array.isArray(data) ? data : [];
  }, [reservas, data]);

  // Auth/rol 
  const auth = (() => { try { return useAuth?.() || {}; } catch { return {}; } })();
  const role = roleOverride || auth?.user?.role || 'guest';

  // Columnas visibles (persistidas)
  const [colIds, setColIds] = useState(() => {
    try {
      const stored = localStorage.getItem(makeColsKey(userKey || auth?.user?.id || 'default'));
      return stored ? JSON.parse(stored) : tablePreset.columns.map(c => c.id);
    } catch {
      return tablePreset.columns.map(c => c.id);
    }
  });

  // Persistir columnas
  useEffect(() => {
    try {
      localStorage.setItem(makeColsKey(userKey || auth?.user?.id || 'default'), JSON.stringify(colIds));
    } catch {}
  }, [colIds, userKey, auth?.user?.id]);

  // Columnas visibles filtradas
  const visibleCols = useMemo(() => {
    const map = new Map();
    tablePreset.columns.forEach(col => {
      if (colIds.includes(col.id)) {
        map.set(col.id, {
          ...col,
          titulo: col.titulo,
          accessor: col.accessor || ((row) => row[col.accessorKey || col.id])
        });
      }
    });
    return Array.from(map.values());
  }, [colIds, tablePreset.columns]);

  // ===== permisos  =====
  const can = (key) => {
    switch (key) {
      case 'ver':           return canDashboardAction(auth?.user, 'visualizarReserva');
      case 'editar':        return canDashboardAction(auth?.user, 'editarReserva');
      case 'eliminar':      return canDashboardAction(auth?.user, 'eliminarReserva');
      case 'documentos':    return canDashboardAction(auth?.user, 'verDocumentos');
      default:              return false;
    }
  };

  // ===== acciones de fila =====
  const renderRowActions = (reserva) => (
    <div className="tl-actions">
      {can('ver') && (
        <button 
          className="tl-icon tl-icon--view" 
          aria-label="Ver reserva" 
          data-tooltip="Ver Reserva" 
          onClick={() => onVer?.(reserva)}
        >
          <Eye size={18} strokeWidth={2} />
        </button>
      )}
      {can('editar') && (
        <button 
          className="tl-icon tl-icon--edit" 
          aria-label="Editar reserva" 
          data-tooltip="Editar reserva" 
          onClick={() => onEditar?.(reserva)}
        >
          <Edit size={18} strokeWidth={2} />
        </button>
      )}
      {can('documentos') && (
        <button 
          className="tl-icon tl-icon--docs" 
          aria-label="Ver documentos" 
          data-tooltip="Ver documentos" 
          onClick={() => onVerDocumentos?.(reserva)}
        >
          <FileText size={18} strokeWidth={2} />
        </button>
      )}
      {can('eliminar') && (
        <button 
          className="tl-icon tl-icon--delete" 
          aria-label="Eliminar reserva" 
          data-tooltip="Eliminar reserva" 
          onClick={() => onEliminar?.(reserva)}
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );

  // ===== toolbar derecha =====
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
          className="tl-btn tl-btn--primary" 
          onClick={() => onAgregarReserva?.()}
        >
          + Registrar Reserva
        </button>
      )}
    </div>
  );

  return (
    <TablaBase
      rows={source}
      rowKey="id"
      columns={visibleCols}
      widthFor={tablePreset.widthFor}
      defaultVisibleIds={tablePreset.columns.map(c => c.id)}
      maxVisible={Math.max(5, tablePreset.columns.length)}
      renderRowActions={renderRowActions}
      toolbarRight={toolbarRight}
      defaultPageSize={25}
      selected={selectedIds}
      onSelectedChange={onSelectedChange}
    />
  );
}
