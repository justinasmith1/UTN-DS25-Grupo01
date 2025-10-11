import React, { useMemo, useState, useEffect, useRef } from 'react';
import './TablaLotes/TablaLotes.css';

import PageSizeDropdown from './TablaLotes/parts/PageSizeDropdown';
import ColumnPicker from './TablaLotes/parts/ColumnPicker';
import { Columns3 } from 'lucide-react';

// ---- Normalizador robusto ----
function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.rows)) return payload.rows;
  }
  return [];
}

export default function TablaBase({
  // Datos (puede venir [] o {data:[]} o {rows:[]})
  rows = [],
  rowKey = 'id',

  // Columnas y layout
  columns = [],                // [{ id, titulo, align?, accessor(row) | accessorKey }]
  widthFor = () => '1fr',
  defaultVisibleIds = null,
  maxVisible = 6,

  // Acciones por fila
  renderRowActions = null,

  // Toolbar derecha (módulo)
  toolbarRight = null,

  // Paginación
  defaultPageSize = 25,

  // === Selección controlada (nuevo) ===
  selected,                 // array de ids seleccionados (opcional)
  onSelectedChange,         // fn(ids[]) (opcional)
}) {
  // ---- Normalizo una vez ----
  const rowsNorm = useMemo(() => toArray(rows), [rows]);

  // ===== columnas únicas =====
  const ALL_SAFE = useMemo(
    () => [...new Map(columns.map((c) => [c.id, c])).values()],
    [columns]
  );

  // ===== visibles iniciales =====
  const baseDefaultCols = useMemo(() => {
    if (Array.isArray(defaultVisibleIds) && defaultVisibleIds.length) {
      return defaultVisibleIds.filter((id) => ALL_SAFE.some((c) => c.id === id));
    }
    return ALL_SAFE.map((c) => c.id);
  }, [defaultVisibleIds, ALL_SAFE]);

  const [colIds, setColIds] = useState(baseDefaultCols);
  useEffect(() => setColIds(baseDefaultCols), [baseDefaultCols]);

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

  // ===== grilla =====
  const gridTemplate = useMemo(() => {
    const cols = visibleCols.map((c) => widthFor(c.id)).join(' ');
    return `42px ${cols} 1fr 220px`; // checkbox + visibles + spacer + acciones
  }, [visibleCols, widthFor]);

  // ===== paginación =====
  const PAGE_SIZES = [10, 25, 50, 'Todos'];
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const normalizedPageSize =
    pageSize === 'Todos' ? 'Todos' : (Number(pageSize) || 25);

  const [page, setPage] = useState(1);
  const total = rowsNorm.length;
  const pageCount =
    normalizedPageSize === 'Todos'
      ? 1
      : Math.max(1, Math.ceil(total / Number(normalizedPageSize)));
  useEffect(() => setPage(1), [normalizedPageSize]);

  const pageItems = useMemo(() => {
    if (normalizedPageSize === 'Todos') return rowsNorm;
    const start = (page - 1) * Number(normalizedPageSize);
    return rowsNorm.slice(start, start + Number(normalizedPageSize));
  }, [rowsNorm, page, normalizedPageSize]);

  // ===== selección =====
  const controlled = Array.isArray(selected) && typeof onSelectedChange === 'function';
  const [internalSelected, setInternalSelected] = useState([]);
  // fuente de verdad
  const selectedIds = controlled ? selected : internalSelected;
  const setSelectedIds = controlled ? onSelectedChange : setInternalSelected;

  const getId = (r) => String(r?.[rowKey]);
  const pageRowIds = useMemo(
    () => pageItems.map(getId).filter((x) => x !== 'undefined' && x !== 'null'),
    [pageItems]
  );
  const allOnPageSelected =
    pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds.includes(id));

  const toggleRow = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return Array.from(next);
    });

  const toggleAllOnPage = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageRowIds.forEach((id) => next.delete(id));
      else pageRowIds.forEach((id) => next.add(id));
      return Array.from(next);
    });

  // Si cambian las filas de la página, mantenemos coherencia
  useEffect(() => {
    // eliminar seleccionados que ya no están en la tabla completa
    const valid = new Set(rowsNorm.map(getId));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [rowsNorm]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== ColumnPicker (abre con is-open, lo maneja el CSS) =====
  const colsRef = useRef(null);
  const [colsOpen, setColsOpen] = useState(false);
  useEffect(() => {
    const onDocClick = (e) => {
      if (!colsRef.current) return;
      // No cerrar si el click es dentro del contenedor del ColumnPicker
      if (!colsRef.current.contains(e.target)) {
        setColsOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const empty = total === 0;

  return (
    <div className="tl-wrapper">
      {/* Toolbar */}
      <div className="tl-toolbar">
        <div className="tl-pages-left">
          <PageSizeDropdown
            value={normalizedPageSize}
            options={PAGE_SIZES}
            onChange={(opt) => setPageSize(opt === 'Todos' ? 'Todos' : Number(opt))}
          />

          <div className="tl-columns" ref={colsRef}>
            <button
              type="button"
              className="tl-btn tl-btn--ghost tl-btn--columns2 tl-btn__columns"
              onClick={() => setColsOpen((v) => !v)}
              title="Elegir columnas"
            >
              <Columns3 size={18} strokeWidth={2} />
              <span className="tl-btn__text">Columnas</span>
            </button>

            <div className={`tl-popover__container ${colsOpen ? 'is-open' : ''}`}>
              <ColumnPicker
                all={ALL_SAFE}
                selected={colIds}
                onChange={setColIds}
                max={Math.max(maxVisible, baseDefaultCols.length)}
                onResetVisibleCols={() => setColIds(baseDefaultCols)}
              />
            </div>
          </div>
        </div>

        <div className="tl-actions-right">{toolbarRight}</div>
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
              <div key={c.id} className={`tl-th tl-th--${c.align || 'left'}`}>
                {c.titulo ?? c.header ?? c.id}
              </div>
            ))}
            <div aria-hidden className="tl-th tl-th--spacer-invisible" />
            <div className="tl-th tl-th--actions">Acciones</div>
          </div>
        </div>

        {/* Body */}
        <div className="tl-tbody">
          {empty && <div className="tl-empty">No hay datos para mostrar.</div>}

          {!empty &&
            pageItems.map((row) => {
              const id = getId(row);
              return (
                <div key={id} className="tl-tr" style={{ gridTemplateColumns: gridTemplate }}>
                  <div className="tl-td tl-td--checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(id)}
                      onChange={() => toggleRow(id)}
                    />
                  </div>

                  {visibleCols.map((c) => {
                    const val =
                      typeof c.accessor === 'function'
                        ? c.accessor(row)
                        : c.accessorKey
                        ? row?.[c.accessorKey] ?? '—'
                        : '—';
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
                    {typeof renderRowActions === 'function' ? renderRowActions(row) : null}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Paginador abajo a la derecha */}
      {normalizedPageSize !== 'Todos' && (
        <div className="tl-pagination" style={{ justifyContent: 'flex-end' }}>
          <button
            className="tl-btn tl-btn--ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ‹ Anterior
          </button>
          <span className="tl-pageinfo">
            Página {page} de {pageCount}
          </span>
          <button
            className="tl-btn tl-btn--ghost"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
          >
            Siguiente ›
          </button>
        </div>
      )}
    </div>
  );
}