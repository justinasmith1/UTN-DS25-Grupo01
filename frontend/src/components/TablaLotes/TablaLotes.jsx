import React, { useMemo, useState, useEffect } from 'react';
import './TablaLotes.css';

import { useAuth } from '../../app/providers/AuthProvider';
import { Eye, Edit, Trash2, DollarSign, CirclePercent } from 'lucide-react';
import { canDashboardAction, filterEstadoOptionsFor } from '../../lib/auth/rbac.ui';

import TablaBase from '../Table/TablaBase.jsx';

import StatusBadge, { estadoBadge } from './cells/StatusBadge';
import SubstatusBadge, { subestadoBadge } from './cells/SubstatusBadge';
import { fmtMoney, fmtM2, fmtM, fmtEstado } from './utils/formatters';
import { getPropietarioNombre, getCalle, getNumero } from './utils/getters';

import { lotesTablePreset as tablePreset } from './presets/lotes.table.jsx';

// ---- Normalizador
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.rows)) return payload.rows;
  }
  return [];
}

export default function TablaLotes(props) {
  const {
    lotes, data, lotesFiltrados, rows, items, lots,
    onVer, onEditar, onRegistrarVenta, onEliminar, onAplicarPromo,
    onAgregarLote,
    roleOverride,
  } = props;

  const auth = (() => { try { return useAuth?.() || {}; } catch { return {}; } })();
  const role = (roleOverride || auth?.user?.role || auth?.role || 'admin').toString().toLowerCase();

  const helpers = useMemo(
    () => ({
      cells: { estadoBadge, subestadoBadge, StatusBadge, SubstatusBadge },
      fmt: { fmtMoney, fmtM2, fmtM, fmtEstado },
      getters: { getPropietarioNombre, getCalle, getNumero },
    }),
    []
  );

  const ALL_COLUMNS = useMemo(() => tablePreset.makeColumns(helpers), [helpers]);
  const widthFor = tablePreset.widthFor;

  const source = useMemo(() => {
    const cands = [lotesFiltrados, lotes, data, rows, items, lots, props?.data, props?.dataset];
    for (const c of cands) {
      const arr = toArray(c);
      if (arr.length) return arr;
    }
    for (const c of cands) {
      const arr = toArray(c);
      if (Array.isArray(arr)) return arr;
    }
    return [];
  }, [lotesFiltrados, lotes, data, rows, items, lots, props?.data, props?.dataset]);

  const ALL_EST = ['DISPONIBLE', 'NO_DISPONIBLE', 'RESERVADO', 'VENDIDO', 'ALQUILADO'];
  const allowedEstados = useMemo(
    () => new Set(filterEstadoOptionsFor(auth?.user || { role }, ALL_EST)),
    [auth?.user, role]
  );
  const norm = (s) => (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const isNoDisponible = (l) => norm(String(l?.estado ?? l?.status ?? '')).replace(/_/g, ' ') === 'no disponible';

  const rowsForTable = useMemo(() => {
    if (!allowedEstados.has('NO_DISPONIBLE')) return source.filter((l) => !isNoDisponible(l));
    return source;
  }, [source, allowedEstados]);

  // ===== Selección controlada (para los botones de la toolbar)
  const [selectedIds, setSelectedIds] = useState([]);
  // si cambian las filas (por filtros), limpiamos selección
  useEffect(() => setSelectedIds([]), [rowsForTable]);

  const can = (key) => {
    switch (key) {
      case 'ver':           return canDashboardAction(auth?.user, 'visualizarLote');
      case 'editar':        return canDashboardAction(auth?.user, 'editarLote');
      case 'venta':         return canDashboardAction(auth?.user, 'registrarVenta');
      case 'eliminar':      return canDashboardAction(auth?.user, 'eliminarLote');
      case 'aplicarPromo':  return canDashboardAction(auth?.user, 'aplicarPromocion');
      default:              return false;
    }
  };

  const renderRowActions = (l) => (
    <div className="tl-actions">
      {can('ver') && (
        <button className="tl-icon tl-icon--view" aria-label="Ver lote" data-tooltip="Ver Lote" onClick={() => onVer?.(l)}>
          <Eye size={18} strokeWidth={2} />
        </button>
      )}
      {can('editar') && (
        <button className="tl-icon tl-icon--edit" aria-label="Editar lote" data-tooltip="Editar lote" onClick={() => onEditar?.(l)}>
          <Edit size={18} strokeWidth={2} />
        </button>
      )}
      {can('venta') && (
        <button className="tl-icon tl-icon--money" aria-label="Registrar venta" data-tooltip="Registrar venta" onClick={() => onRegistrarVenta?.(l)}>
          <DollarSign size={18} strokeWidth={2} />
        </button>
      )}
      {can('eliminar') && (
        <button className="tl-icon tl-icon--delete" aria-label="Eliminar lote" data-tooltip="Eliminar lote" onClick={() => onEliminar?.(l)}>
          <Trash2 size={18} strokeWidth={2} />
        </button>
      )}
      {can('aplicarPromo') && (
        <button className="tl-icon tl-icon--promo" aria-label="Aplicar promoción" data-tooltip="Aplicar promoción" onClick={() => onAplicarPromo?.(l)}>
          <CirclePercent size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );

  // ===== toolbar derecha (usa selectedIds controlada)
  const toolbarRight = (
    <div className="tl-actions-right">
      <button
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={selectedIds.length === 0}
        title={selectedIds.length === 0 ? 'Selecciona filas para ver en mapa' : undefined}
      >
        Ver en mapa (futuro) ({selectedIds.length})
      </button>
      <button
        type="button"
        className="tl-btn tl-btn--soft"
        onClick={() => setSelectedIds([])}
        title="Quitar selección"
        disabled={selectedIds.length === 0}
      >
        Limpiar selección
      </button>
      {role.includes('admin') && (
        <button type="button" className="tl-btn tl-btn--primary" onClick={() => onAgregarLote?.()}>
          + Agregar Lote
        </button>
      )}
    </div>
  );

  const baseVisibleIds = useMemo(() => {
    const key = role.toLowerCase();
    const tpl = tablePreset.COLUMN_TEMPLATES_BY_ROLE[key] || tablePreset.COLUMN_TEMPLATES_BY_ROLE.admin || [];
    const idsPresentes = new Set(ALL_COLUMNS.map((c) => c.id));
    return tpl.filter((id) => idsPresentes.has(id));
  }, [role, ALL_COLUMNS]);

  return (
    <TablaBase
      rows={rowsForTable}
      rowKey="id"
      columns={ALL_COLUMNS}
      widthFor={widthFor}
      defaultVisibleIds={baseVisibleIds}
      maxVisible={Math.max(5, baseVisibleIds.length)}
      renderRowActions={renderRowActions}
      toolbarRight={toolbarRight}
      defaultPageSize={10}
      selected={selectedIds}
      onSelectedChange={setSelectedIds}
    />
  );
}