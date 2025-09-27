// components/TablaLotes.jsx
// -----------------------------------------------------------------------------
// Tablero de Lotes - robusto y compatible con props {lotes} o {data}
// Persistencia de columnas VISIBLES por USUARIO+ROL (namespacing + versión).
// Utiliza el css personalizado de la tabla
// Recibe informacion del filtrado de lotes -- no hace request propias al back -- trae todo y sobre eso trabaja
// -----------------------------------------------------------------------------

import React, { useMemo, useState, useEffect, useRef } from 'react';
import './TablaLotes.css';
import { useAuth } from '../../app/providers/AuthProvider';
import { Eye, Edit, Trash2, DollarSign, Columns3, CirclePercent, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ─────────────────────────────────────────────────────────────
// Constante legacy (para migración desde la versión previa)
// ─────────────────────────────────────────────────────────────
const LS_KEY = 'tablaLotes:columns:v7'; // <<— clave vieja, si existe la migramos una vez

// ─────────────────────────────────────────────────────────────
// 1) Helpers de storage VERSIONADO + namespacing por usuario/rol
//    Explicación: guardamos por usuario+rol para que una sesión
//    no herede la disposición de otra en la misma PC.
// ─────────────────────────────────────────────────────────────
const STORAGE_VERSION = 'v2';
const APP_NS = 'lfed'; // La Federala
const makeColsKey = (userKey) => `${APP_NS}:tabla-cols:${STORAGE_VERSION}:${userKey}`;

// ─────────────────────────────────────────────────────────────
//              ----------- Helpers -------------
// ─────────────────────────────────────────────────────────────
// Para el simbolo de la plata
const fmtMoney = (v) => { 
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
};

// Para los metros cuadrados
const fmtM2 = (v) => { 
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return (
    <span className="u-m2">
      {n.toLocaleString('es-AR')}
      <span className="u-unit">m²</span>
    </span>
  );
};

// Para los metros
const fmtM = (v) => { 
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return (
    <span className="u-m2">
      {n.toLocaleString('es-AR')}
      <span className="u-unit">m</span>
    </span>
  );
};

// Para el estado
const fmtEstado = (s) =>
  !s
    ? '—'
    : String(s)
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());

const badge = (label, variant = 'muted') => (
  <span className={`tl-badge tl-badge--${variant}`}>{label}</span>
);

const estadoBadge = (raw) => {
  const s = fmtEstado(raw).toUpperCase();
  const map = {
    'DISPONIBLE': 'success',
    'EN PROMOCION': 'warn',
    'RESERVADO': 'info',
    'ALQUILADO': 'indigo',
    'VENDIDO': 'success',
    'NO DISPONIBLE': 'danger',
  };
  return badge(s, map[s] || 'muted');
};

// Paa el subestado
const subestadoBadge = (raw) => {
  const s = fmtEstado(raw).toUpperCase();
  const map = {
    'CONSTRUIDO': 'success',
    'EN CONSTRUCCION': 'warn',
    'NO CONSTRUIDO': 'danger',
  };
  return badge(s, map[s] || 'muted');
};
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// -------------------- Mapeos según schema --------------------
// ─────────────────────────────────────────────────────────────
function getPropietarioNombre(l) {
  const p = l?.propietario;
  if (!p) return l?.propietarioNombre ?? l?.ownerName ?? '—';
  if (p.nombreCompleto) return p.nombreCompleto;
  const partes = [p.nombre, p.apellido].filter(Boolean);
  if (partes.length) return partes.join(' ');
  return p.razonSocial ?? String(p.id ?? '—');
}
function getCalle(l) {
  const u = l?.ubicacion;
  return u?.calle ?? u?.nombreCalle ?? l?.calle ?? '—';
}
function getNumero(l) {
  const u = l?.ubicacion;
  return u?.numero ?? l?.numero ?? '—';
}
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//    -------------------- Columnas --------------------
// ─────────────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { id: 'id',          titulo: 'ID',         accessor: (l) => l.id ?? l.idLote ?? l.codigo ?? '—',         align: 'center'  },
  { id: 'estado',      titulo: 'Estado',     accessor: (l) => estadoBadge(l.estado),                       align: 'center'},
  { id: 'propietario', titulo: 'Propietario',accessor: (l) => getPropietarioNombre(l),                    align: 'center'  },
  { id: 'calle',       titulo: 'Calle',      accessor: (l) => getCalle(l),                                 align: 'center'  },
  { id: 'numero',      titulo: 'Número',     accessor: (l) => getNumero(l),                                align: 'center'},
  { id: 'superficie',  titulo: 'Superficie', accessor: (l) => fmtM2(l.superficie ?? l.metros ?? l.m2),     align: 'right' },
  { id: 'frente',      titulo: 'Frente',     accessor: (l) => fmtM(l.frente),                              align: 'right' },
  { id: 'fondo',       titulo: 'Fondo',      accessor: (l) => fmtM(l.fondo),                               align: 'right' },
  { id: 'precio',      titulo: 'Precio',     accessor: (l) => fmtMoney(l.precio),                          align: 'center'},
  { id: 'deuda',       titulo: 'Deuda',
    accessor: (l) =>
      l.deuda == null ? (
        <span className="tl-badge tl-badge--muted">N/D</span>
      ) : l.deuda ? (
        <span className="tl-badge tl-badge--danger">DEUDOR</span>
      ) : (
        <span className="tl-badge tl-badge--success">AL DÍA</span>
      ),
    align: 'center',
  },
  { id: 'subestado',   titulo: 'Subestado',  accessor: (l) => subestadoBadge(l.subestado),                 align: 'center'  },
  { id: 'descripcion', titulo: 'Descripción',accessor: (l) => l.descripcion ?? '—',                        align: 'left'  },
];

// Sin duplicados por id (evita el doble “subestado”).
const ALL_SAFE = [...new Map(ALL_COLUMNS.map((c) => [c.id, c])).values()];

// Columnas por defecto (y para “Restablecer”)
const DEFAULT_COLS = ['id', 'estado', 'propietario', 'calle', 'precio'];


// ─────────────────────────────────────────────────────────────
//  ----------- Para elegir las columnas a mostrar  ----------
// ─────────────────────────────────────────────────────────────
function ColumnPicker({ all, selected, onChange, max = 5, onResetVisibleCols }) {
  const totalSel = selected.length;
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggle = (id) => {
    const isSel = selected.includes(id);
    if (isSel) {
      onChange(selected.filter((x) => x !== id));
    } else {
      if (selected.length >= max) return;             
      onChange([...new Set([...selected, id])]);      
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = selected.indexOf(active.id);
      const newIndex = selected.indexOf(over.id);
      const newSelected = arrayMove(selected, oldIndex, newIndex);
      onChange(newSelected);
    }
  };

  // Solo mostrar las columnas seleccionadas para el drag & drop, respetando el orden de 'selected'
  const selectedColumns = selected.map(id => all.find(c => c.id === id)).filter(Boolean);

  return (
    <div className="tl-popover">
      <div className="tl-popover__header">
        <strong>Columnas</strong>
        <span className={`tl-chip ${totalSel >= max ? 'is-max' : ''}`}>{totalSel}/{max}</span>
      </div>

      <div className="tl-popover__list">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={selected} strategy={verticalListSortingStrategy}>
            {/* Columnas seleccionadas (con drag & drop) */}
            {selectedColumns.map((c) => {
              const checked = selected.includes(c.id);
              const disabled = !checked && totalSel >= max;
              return (
                <SortableItem
                  key={c.id}
                  id={c.id}
                  column={c}
                  checked={checked}
                  disabled={disabled}
                  onToggle={toggle}
                />
              );
            })}
          </SortableContext>
        </DndContext>

        {/* Separador */}
        {selectedColumns.length > 0 && (
          <div className="tl-popover__separator">
            <span>Columnas disponibles</span>
          </div>
        )}

        {/* Columnas no seleccionadas (sin drag & drop) */}
        {all.filter(c => !selected.includes(c.id)).map((c) => {
          const checked = selected.includes(c.id);
          const disabled = !checked && totalSel >= max;
          return (
            <label key={c.id} className={`tl-check ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(c.id)}
              />
              <span>{c.titulo}</span>
            </label>
          );
        })}
      </div>

      <button
        type="button"
        className="tl-btn tl-btn--ghost"
        // Importante: delegamos el "reset total" al padre para que limpie
        // también el localStorage del usuario actual.
        onClick={() => onResetVisibleCols?.()}
      >
        Restablecer
      </button>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//    ----------------- Componente SortableItem ------------
// ─────────────────────────────────────────────────────────────
function SortableItem({ id, column, checked, disabled, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <label
      ref={setNodeRef}
      style={style}
      className={`tl-check tl-check--sortable ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''}`}
      {...attributes}
    >
      <div className="tl-check__drag-handle" {...listeners}>
        <GripVertical size={16} />
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(id)}
      />
      <span>{column.titulo}</span>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
//   -------- Dropdown de cantidad de lotes a mostrar -----
// ─────────────────────────────────────────────────────────────
function PageSizeDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const label = String(value);
  return (
    <div className={`tl-dd ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        type="button"
        className="tl-btn tl-btn--ghost tl-btn--columns2 tl-dd__button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {label}<span className="tl-dd__chev">▾</span>
      </button>
      {open && (
        <div className="tl-dd__menu" role="listbox">
          {options.map((opt) => {
            const l = String(opt);
            return (
              <button
                type="button"
                key={l}
                className={`tl-dd__item ${l === label ? 'is-active' : ''}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {l}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//    --------- Ancho por columna (grilla) --------------
// ─────────────────────────────────────────────────────────────
const widthFor = (id) => {
  switch (id) {
    case 'id':         return '96px';
    case 'estado':     return '160px';
    case 'subestado':  return '170px';
    case 'propietario':return '220px';
    case 'calle':      return '220px';
    case 'descripcion':return 'minmax(370px,2fr)';
    case 'numero':     return '120px';
    case 'superficie': return '120px';
    case 'frente':     return '120px';
    case 'fondo':      return '120px';
    case 'precio':     return '140px';
    case 'deuda':      return '140px';
    default:           return 'minmax(140px,1fr)';
  }
};
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//   ----------------- Componente principal -----------------
// ─────────────────────────────────────────────────────────────
export default function TablaLotes({
  lotes, data,
  onVer, onEditar, onRegistrarVenta, onEliminar,
  onAgregarLote, onAplicarPromo,
  roleOverride,
  userKey,                 
}) {
  // 1) Dataset (acepta lotes o data)
  const source = useMemo(() => {
    if (Array.isArray(lotes) && lotes.length) return lotes;
    if (Array.isArray(data)  && data.length)  return data;
    return Array.isArray(lotes) ? lotes : Array.isArray(data) ? data : [];
  }, [lotes, data]);

  // 2) Rol
  const auth = (() => { try { return useAuth?.() || {}; } catch { return {}; } })();
  const role = (roleOverride || auth?.user?.role || auth?.role || 'admin').toString().toLowerCase();

  // 2.1) Clave efectiva por usuario+rol
  // Si viene userKey desde Dashboard, la usamos. Si no, derivamos desde el auth + rol.
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

  // Helper local: normaliza y detecta “NO DISPONIBLE”
  const norm = (s) =>
    (s ?? '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const isNoDisponible = (estado) => norm(estado).replace(/_/g, ' ') === 'no disponible';

  // Regla para INMOBILIARIA:
  // si el rol incluye "inmob", antes de paginar/mostrar filtramos fuera los NO DISPONIBLE.
  const filteredSource = useMemo(() => {
    if (role.includes('inmob')) {
      return source.filter((l) => !isNoDisponible(l?.estado));
    }
    return source;
  }, [source, role]);

  // 3) Columnas visibles (inicializa con defaults y luego carga por usuario)
  const [colIds, setColIds] = useState(DEFAULT_COLS);

  // 3.1) CARGA por usuario/rol + migración desde clave vieja si existía
  useEffect(() => {
    const key = makeColsKey(effectiveUserKey);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          // Sanitizar por si cambió el set de columnas
          const valid = parsed.filter((id) => ALL_SAFE.some((c) => c.id === id));
          setColIds(valid.length ? valid : DEFAULT_COLS);
          return;
        }
      }
      // Migración simple desde la clave vieja (una sola vez)
      const legacy = localStorage.getItem(LS_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy); // copiamos a la nueva clave namespaced
        const parsed = JSON.parse(legacy);
        const valid = Array.isArray(parsed)
          ? parsed.filter((id) => ALL_SAFE.some((c) => c.id === id))
          : DEFAULT_COLS;
        setColIds(valid.length ? valid : DEFAULT_COLS);
        return;
      }
      // Fallback a defaults
      setColIds(DEFAULT_COLS);
    } catch {
      setColIds(DEFAULT_COLS);
    }
  }, [effectiveUserKey]);

  // 3.2) GUARDADO por usuario/rol
  useEffect(() => {
    const key = makeColsKey(effectiveUserKey);
    try {
      localStorage.setItem(key, JSON.stringify(colIds));
    } catch {}
  }, [colIds, effectiveUserKey]);

  // 3.3) Columnas visibles (objetos completos) a partir de colIds
  const visibleCols = useMemo(() => {
    const map = new Map();
    colIds.forEach((id) => {
      if (!map.has(id)) {
        const def = ALL_SAFE.find((c) => c.id === id);
        if (def) map.set(id, def);
      }
    });
    return Array.from(map.values());
  }, [colIds]);

  // 4) Paginación + selección (ahora sobre filteredSource)
  const PAGE_SIZES = [10, 25, 50, 'Todos'];
  const [pageSize, setPageSize] = useState(PAGE_SIZES[1]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => { setPage(1); setSelectedIds([]); }, [filteredSource, pageSize]);

  const total = filteredSource.length;
  const size = pageSize === 'Todos' ? total : Number(pageSize) || PAGE_SIZES[1];
  const pageCount = Math.max(1, Math.ceil((total || 1) / (size || 1)));
  const start = (page - 1) * (size || 0);
  const end = pageSize === 'Todos' ? total : start + size;

  const pageItems = useMemo(
    () => (pageSize === 'Todos' ? filteredSource : filteredSource.slice(start, end)),
    [filteredSource, pageSize, start, end]
  );

  // 5) Selección por fila
  const getRowId = (l) => l.id ?? l.idLote ?? l.codigo;
  const allOnPageIds = pageItems.map(getRowId).filter((x) => x != null);
  const allOnPageSelected =
    allOnPageIds.length > 0 && allOnPageIds.every((id) => selectedIds.includes(id));

  const toggleRow = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAllOnPage = () =>
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (allOnPageSelected) allOnPageIds.forEach((id) => s.delete(id));
      else allOnPageIds.forEach((id) => s.add(id));
      return Array.from(s);
    });

  // 6) Acciones por rol
  const roleActions = useMemo(() => {
    if (role.includes('inmob')) return ['venta', 'ver'];
    if (role.includes('gestor') || role.includes('tecnico')) return ['ver', 'editar'];
    return ['ver', 'editar', 'venta', 'eliminar', 'aplicarPromo']; // admin
  }, [role]);
  const can = (a) => roleActions.includes(a);

  // 7) Grilla: checkbox + columnas visibles + columna Acciones (con flexbox para anclar acciones a la derecha)
  const gridTemplate = useMemo(() => {
    const cols = visibleCols.map((c) => widthFor(c.id)).join(' ');
    return `42px ${cols} 1fr 220px`;
  }, [visibleCols]);

  const empty = total === 0;
// ─────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────
  // -------------- Renderizado --------------------------------
  // ─────────────────────────────────────────────────────────────
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

          {/* Columnas */}
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
                max={5}
                // Importante: al restablecer limpiamos la preferencia del usuario actual
                // y volvemos a las columnas por defecto.
                onResetVisibleCols={() => {
                  try {
                    localStorage.removeItem(makeColsKey(effectiveUserKey));
                  } catch {}
                  setColIds([...new Set(DEFAULT_COLS)]);
                }}
              />
            </div>
          </div>
        </div>

        <div className="tl-actions-right">
          <button
              type="button"
              className="tl-btn tl-btn--soft"
              disabled={selectedIds.length === 0}
            >
              Ver en mapa (futuro) ({selectedIds.length})
          </button>
          {role.includes('admin') && (
            <button
              type="button"
              className="tl-btn tl-btn--primary"
              onClick={() => onAgregarLote?.()}
            >
              + Agregar Lote
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="tl-table">
        {/* Header */}
        <div className="tl-thead">
          <div className="tl-tr" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="tl-th tl-th--checkbox">
              <input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} />
            </div>
            {visibleCols.map((c) => (
              <div key={c.id} className={`tl-th tl-th--${c.align || 'left'}`}>
                {c.titulo}
              </div>
            ))}
            {/* Spacer invisible para anclar acciones a la derecha */}
            <div aria-hidden className="tl-th tl-th--spacer-invisible" />
            {/* Columna Acciones */}
            <div className="tl-th tl-th--actions">Acciones</div>
          </div>
        </div>

        {/* Body */}
        <div className="tl-tbody">
          {empty && <div className="tl-empty">No se encontraron lotes.</div>}

          {!empty &&
            pageItems.map((l) => {
              const rowId = getRowId(l);
              return (
                <div key={rowId} className="tl-tr" style={{ gridTemplateColumns: gridTemplate }}>
                  <div className="tl-td tl-td--checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(rowId)}
                      onChange={() => toggleRow(rowId)}
                    />
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

                  {/* Spacer invisible para anclar acciones a la derecha */}
                  <div aria-hidden className="tl-td tl-td--spacer-invisible" />

                  {/* Acciones */}
                  <div className="tl-td tl-td--actions" data-col="actions">
                    {can('ver') && (
                      <button
                        className="tl-icon tl-icon--view"
                        aria-label="Ver lote"
                        data-tooltip="Ver Lote"
                        onClick={() => onVer?.(l)}
                      >
                        <Eye size={18} strokeWidth={2} />
                      </button>
                    )}
                    {can('editar') && (
                      <button
                        className="tl-icon tl-icon--edit"
                        aria-label="Editar lote"
                        data-tooltip="Editar lote"
                        onClick={() => onEditar?.(l)}
                      >
                        <Edit size={18} strokeWidth={2} />
                      </button>
                    )}
                    {can('venta') && (
                      <button
                        className="tl-icon tl-icon--money"
                        aria-label="Registrar venta"
                        data-tooltip="Registrar venta"
                        onClick={() => onRegistrarVenta?.(l)}
                      >
                        <DollarSign size={18} strokeWidth={2} />
                      </button>
                    )}
                    {can('eliminar') && (
                      <button
                        className="tl-icon tl-icon--delete"
                        aria-label="Eliminar lote"
                        data-tooltip="Eliminar lote"
                        onClick={() => onEliminar?.(l)}
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                    )}
                    {can('aplicarPromo') && (
                      <button
                        className="tl-icon tl-icon--promo"
                        aria-label="Aplicar promoción"
                        data-tooltip="Aplicar promoción"
                        onClick={() => onAplicarPromo?.(l)}
                      >
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
          <button
            className="tl-btn tl-btn--ghost"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ‹ Anterior
          </button>
          <span className="tl-pageinfo">Página {page} de {pageCount}</span>
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
