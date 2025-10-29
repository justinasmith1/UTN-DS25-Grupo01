import React, { useMemo, useState, useEffect } from 'react';
import TablaBase from '../TablaBase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { canDashboardAction } from '../../../lib/auth/rbac.ui';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';

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
          aria-label="Ver venta"
          onClick={() => onVer?.(venta)}
        >
          <Eye size={18} strokeWidth={2} />
        </button>
      )}
      {can('editar') && (
        <button
          className="tl-icon tl-icon--edit"
          aria-label="Editar venta"
          onClick={() => onEditar?.(venta)}
        >
          <Edit size={18} strokeWidth={2} />
        </button>
      )}
      {can('documentos') && (
        <button
          className="tl-icon tl-icon--docs"
          aria-label="Ver documentos"
          onClick={() => onVerDocumentos?.(venta)}
        >
          <FileText size={18} strokeWidth={2} />
        </button>
      )}
      {can('eliminar') && (
        <button
          className="tl-icon tl-icon--delete"
          aria-label="Eliminar venta"
          onClick={() => onEliminar?.(venta)}
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );

  const toolbarRight = (
    <div className="tl-actions-right">
      <button
        type="button"
        className="tl-btn tl-btn--soft"
        disabled={selectedIds.length === 0}
      >
        Ver en mapa (futuro) ({selectedIds.length})
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
  );
}
