// components/TablaLotes.jsx
// -----------------------------------------------------------------------------
// Tablero de Lotes - robusto y compatible con props {lotes} o {data}
// -----------------------------------------------------------------------------

import React, { useMemo, useState, useEffect, useRef } from 'react';
import './TablaLotes.css';

import { useAuth } from '../../../app/providers/AuthProvider';
import { Eye, Edit, Trash2, DollarSign, Columns3, CirclePercent } from 'lucide-react';

// rbac y visibilidad de estados
import { canDashboardAction, filterEstadoOptionsFor } from '../../../lib/auth/rbac.ui';

// Partes de UI
import PageSizeDropdown from './parts/PageSizeDropdown';
import ColumnPicker from './parts/ColumnPicker';

// Helpers visuales y de formato/getters
import StatusBadge, { estadoBadge } from './cells/StatusBadge';
import SubstatusBadge, { subestadoBadge } from './cells/SubstatusBadge';
import { fmtMoney, fmtM2, fmtM, fmtEstado } from './utils/formatters';
import { getPropietarioNombre, getCalle, getNumero } from './utils/getters';

// Preset con columnas/anchos/plantillas
import { lotesTablePreset as tablePreset } from './presets/lotes.table.jsx';

// Claves de storage
const LS_LEGACY_COLS = 'tablaLotes:columns:v7';
const STORAGE_VERSION = 'v2';
const APP_NS = 'lfed';
const makeColsKey = (userKey) => `${APP_NS}:tabla-cols:${STORAGE_VERSION}:${userKey}`;

export default function TablaLotes({
  lotes, data,
  onVer, onEditar, onRegistrarVenta, onEliminar,
  onAgregarLote, onAplicarPromo,
  roleOverride,
  userKey,
}) {
  // Dataset 
  const source = useMemo(() => {
    if (Array.isArray(lotes) && lotes.length) return lotes;
    if (Array.isArray(data) && data.length) return data;
    return Array.isArray(lotes) ? lotes : Array.isArray(data) ? data : [];
  }, [lotes, data]);

  // Auth/rol 
  const auth = (() => { try { return useAuth?.() || {}; } catch { return {}; } })();
  const role = (roleOverride || auth?.user?.role || auth?.role || 'admin').toString().toLowerCase();

  // userKey persistencia por usuario+rol 
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

  // ===== helpers inyectados al preset =====
  const helpers = useMemo(() => ({
    cells: { estadoBadge, subestadoBadge, StatusBadge, SubstatusBadge },
    fmt: { fmtMoney, fmtM2, fmtM, fmtEstado },
    getters: { getPropietarioNombre, getCalle, getNumero },
  }), []);

  // ===== catálogo de columnas desde el preset =====
  const ALL_COLUMNS = useMemo(() => tablePreset.makeColumns(helpers), [helpers]);
  const ALL_SAFE = useMemo(
    () => [...new Map(ALL_COLUMNS.map((c) => [c.id, c])).values()],
    [ALL_COLUMNS]
  );

  // ===== plantillas por rol  =====
  const getDefaultColsForRole = (r) => {
    const key = (r || '').toLowerCase();
    const tpl = tablePreset.COLUMN_TEMPLATES_BY_ROLE[key] || tablePreset.COLUMN_TEMPLATES_BY_ROLE.admin;
    return tpl.filter((id) => ALL_SAFE.some((c) => c.id === id));
  };

  // ===== visibilidad por estados  =====
  const ALLEST = ['DISPONIBLE','NO_DISPONIBLE','RESERVADO','VENDIDO','ALQUILADO'];
  const allowedEstados = useMemo(
    () => new Set(filterEstadoOptionsFor(auth?.user || { role }, ALLEST)),
    [auth?.user, role]
  );
  const norm = (s) => (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const isNoDisponible = (estado) => norm(estado).replace(/_/g, ' ') === 'no disponible';

  const filteredSource = useMemo(() => {
    if (!allowedEstados.has('NO_DISPONIBLE')) return source.filter((l) => !isNoDisponible(l?.estado));
    return source;
  }, [source, allowedEstados]);

  // ===== columnas visibles  =====
  const baseDefaultCols = useMemo(() => getDefaultColsForRole(role), [role]);
  const MAX_VISIBLE = Math.max(5, baseDefaultCols.length);

  const [colIds, setColIds] = useState(() => baseDefaultCols);

  useEffect(() => {
    const key = makeColsKey(effectiveUserKey);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          const valid = parsed.filter((id) => ALL_SAFE.some((c) => c.id === id));
          setColIds(valid.length ? valid : baseDefaultCols);
          return;
        }
      }
      const legacy = localStorage.getItem(LS_LEGACY_COLS);
      if (legacy) {
        localStorage.setItem(key, legacy);
        const parsed = JSON.parse(legacy);
        const valid = Array.isArray(parsed)
          ? parsed.filter((id) => ALL_SAFE.some((c) => c.id === id))
          : baseDefaultCols;
        setColIds(valid.length ? valid : baseDefaultCols);
        return;
      }
      setColIds(baseDefaultCols);
    } catch {
      setColIds(baseDefaultCols);
    }
  }, [effectiveUserKey, baseDefaultCols, ALL_SAFE]);

  useEffect(() => {
    const key = makeColsKey(effectiveUserKey);
    try { localStorage.setItem(key, JSON.stringify(colIds)); } catch {}
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

  // ===== grilla: usa el widthFor del preset  =====
  const gridTemplate = useMemo(() => {
    const cols = visibleCols.map((c) => tablePreset.widthFor(c.id)).join(' ');
    return `42px ${cols} 1fr 220px`;
  }, [visibleCols]);

  // ===== paginación / selección  =====
  const PAGE_SIZES = [10, 25, 50, 'Todos'];
  const [pageSize, setPageSize] = useState(PAGE_SIZES[1]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => { setPage(1); }, [pageSize]);

  const total = filteredSource.length;
  const size = pageSize === 'Todos' ? total : Number(pageSize) || PAGE_SIZES[1];
  const pageCount = Math.max(1, Math.ceil((total || 1) / (size || 1)));
  const start = (page - 1) * (size || 0);
  const end = pageSize === 'Todos' ? total : start + size;

  const pageItems = useMemo(
    () => (pageSize === 'Todos' ? filteredSource : filteredSource.slice(start, end)),
    [filteredSource, pageSize, start, end]
  );

  const getRowId = (l) => String(l.id ?? l.idLote ?? l.codigo);
  const dataSignature = useMemo(() => filteredSource.map(getRowId).join('|'), [filteredSource]);

  useEffect(() => { setPage(1); setSelectedIds([]); }, [dataSignature]);

  const allOnPageIds = pageItems.map(getRowId).filter((x) => x != null);
  const allOnPageSelected = allOnPageIds.length > 0 && allOnPageIds.every((id) => selectedIds.includes(id));

  const toggleRow = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAllOnPage = () =>
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (allOnPageSelected) allOnPageIds.forEach((id) => s.delete(id));
      else allOnPageIds.forEach((id) => s.add(id));
      return Array.from(s);
    });

  // ===== permisos  =====
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

  const empty = total === 0;

  return (
    <div className="tl-wrapper">
      {/* Toolbar */}
      <div className="tl-toolbar">
        <div className="tl-pages-left">
          <PageSizeDropdown
            value={pageSize}
            options={[10, 25, 50, 'Todos']}
            onChange={(opt) => setPageSize(opt === 'Todos' ? 'Todos' : Number(opt))}
          />

          {/* Columnas (popover + DnD) */}
          <div className="tl-columns">
            <button
              type="button"
              className="tl-btn tl-btn--ghost tl-btn--columns2"
              onClick={(e) => e.currentTarget.nextElementSibling?.classList.toggle('is-open')}
              title="Elegir columnas"
            >
              <Columns3 size={18} strokeWidth={2} />
              <span className="tl-btn__text">Columnas</span>
            </button>

            <div className="tl-popover__container">
              <ColumnPicker
                all={ALL_SAFE}
                selected={colIds}
                onChange={setColIds}
                max={Math.max(5, baseDefaultCols.length)}
                onResetVisibleCols={() => {
                  try { localStorage.removeItem(makeColsKey(effectiveUserKey)); } catch {}
                  setColIds(baseDefaultCols);
                }}
              />
            </div>
          </div>
        </div>

        <div className="tl-actions-right">
          <button type="button" className="tl-btn tl-btn--soft" disabled={selectedIds.length === 0}>
            Ver en mapa (futuro) ({selectedIds.length})
          </button>
          <button
            type="button"
            className="tl-btn tl-btn--soft"
            disabled={selectedIds.length === 0}
            onClick={() => setSelectedIds([])}
            title="Quitar selección"
          >
            Limpiar selección
          </button>
          {role.includes('admin') && (
            <button type="button" className="tl-btn tl-btn--soft" onClick={() => onAgregarLote?.()}>
              + Agregar Lote
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="tl-table">
        {/* Head */}
        <div className="tl-thead">
          <div className="tl-tr" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="tl-th tl-th--checkbox">
              <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} />
            </div>
            {visibleCols.map((c) => (
              <div key={c.id} className={`tl-th tl-th--${c.align || 'left'}`}>{c.titulo}</div>
            ))}
            <div aria-hidden className="tl-th tl-th--spacer-invisible" />
            <div className="tl-th tl-th--actions">Acciones</div>
          </div>
        </div>

        {/* Body */}
        <div className="tl-tbody">
          {empty && <div className="tl-empty">No se encontraron lotes.</div>}

          {!empty && pageItems.map((l) => {
            const rowId = getRowId(l);
            return (
              <div key={rowId} className="tl-tr" style={{ gridTemplateColumns: gridTemplate }}>
                <div className="tl-td tl-td--checkbox">
                  <input type="checkbox" checked={selectedIds.includes(rowId)} onChange={() => toggleRow(rowId)} />
                </div>

                {visibleCols.map((c) => {
                  const val = c.accessor(l);
                  return (
                    <div
                      key={c.id}
                      data-col={c.id}
                      className={`tl-td tl-td--${c.align || 'left'}`}
                      title={typeof val === 'string' ? val : undefined}
                    >
                      {val}
                    </div>
                  );
                })}

                <div aria-hidden className="tl-td tl-td--spacer-invisible" />

                <div className="tl-td tl-td--actions" data-col="actions">
                  {can('ver') && (
                    <button className="tl-icon tl-icon--view" aria-label="Ver lote" data-tooltip="Ver Lote" onClick={() => onVer?.(l)}>
                      <Eye size={18} strokeWidth={2} />
                    </button>
                  )}
                  {can('editar') && (
                    <button className="tl-icon tl-icon--edit" aria-label="Editar lote" data-tooltip="Editar Lote" onClick={() => onEditar?.(l)}>
                      <Edit size={18} strokeWidth={2} />
                    </button>
                  )}
                  {can('venta') && (
                    <button className="tl-icon tl-icon--money" aria-label="Registrar venta" data-tooltip="Registrar Venta" onClick={() => onRegistrarVenta?.(l)}>
                      <DollarSign size={18} strokeWidth={2} />
                    </button>
                  )}
                  {can('eliminar') && (
                    <button className="tl-icon tl-icon--delete" aria-label="Eliminar lote" data-tooltip="Eliminar Lote" onClick={() => onEliminar?.(l)}>
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                  )}
                  {can('aplicarPromo') && (
                    <button className="tl-icon tl-icon--promo" aria-label="Aplicar promoción" data-tooltip="Aplicar Promoción" onClick={() => onAplicarPromo?.(l)}>
                      <CirclePercent size={18} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paginador */}
      {pageSize !== 'Todos' && pageCount > 1 && (
        <div className="tl-pagination">
          <button className="tl-btn tl-btn--ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            ‹ Anterior
          </button>
          <span className="tl-pageinfo">Página {page} de {pageCount}</span>
          <button className="tl-btn tl-btn--ghost" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  );
}