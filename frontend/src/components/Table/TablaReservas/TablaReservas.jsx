// src/components/Table/TablaReservas/TablaReservas.jsx
// -----------------------------------------------------------------------------
// Tabla de Reservas
// Objetivos:
// - NO tocar TablaBase ni estilos globales.
// - Limitar a 7 columnas visibles simultáneas (para no romper layout).
// - Mantener "Fecha Creación" disponible en el picker (puede activarse si antes
//   desactivás otra, gracias a maxVisible=7).
// - Enriquecer filas a partir de IDs (clienteId, inmobiliariaId, loteId) usando
//   lookups opcionales pasados por props, para mostrar Cliente, Inmobiliaria y
//   Precio Lote sin cambiar el backend.
// -----------------------------------------------------------------------------

import React, { useMemo } from 'react';
import TablaBase from '../TablaBase';

import { useAuth } from '../../../app/providers/AuthProvider';
import { canDashboardAction } from '../../../lib/auth/rbac.ui';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';

import { reservasTablePreset as tablePreset } from './presets/reservas.table.jsx';

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
 * Enriquecemos una fila de reserva con campos planos para que el preset los
 * pueda leer directo sin tocar TablaBase ni cambiar columnas:
 * - clienteNombre
 * - inmobiliariaNombre
 * - lotePrecio
 */
function enrichRow(reserva, { clientesById, inmobiliariasById, lotesById }) {
  const r = { ...reserva };

  // Cliente (por id)
  if (r.clienteId && clientesById && clientesById[r.clienteId]) {
    const cli = clientesById[r.clienteId];
    r.cliente = r.cliente || cli; // si ya viene, no lo pisamos
    r.clienteNombre = r.clienteNombre || resolveClienteNombre(cli);
  }

  // Inmobiliaria (por id)
  if (r.inmobiliariaId && inmobiliariasById && inmobiliariasById[r.inmobiliariaId]) {
    const inmo = inmobiliariasById[r.inmobiliariaId];
    r.inmobiliaria = r.inmobiliaria || inmo;
    r.inmobiliariaNombre = r.inmobiliariaNombre || resolveInmobiliariaNombre(inmo);
  }

  // Lote (por id) → precio
  if (r.loteId && lotesById && lotesById[r.loteId]) {
    const lote = lotesById[r.loteId];
    r.lote = r.lote || { id: lote.id };
    const precio = resolveLotePrecio(lote);
    if (precio != null) r.lotePrecio = precio;
  }

  return r;
}

export default function TablaReservas({
  // datasets
  reservas,
  data,

  // lookups opcionales (pasar alguno de estos)
  clientes,              // array
  inmobiliarias,         // array
  lotes,                 // array
  clientesById,          // map
  inmobiliariasById,     // map
  lotesById,             // map
  lookups,               // { clientesById, inmobiliariasById, lotesById }

  // callbacks de acciones
  onVer,
  onEditar,
  onEliminar,
  onVerDocumentos,
  onAgregarReserva,

  // selección (controlado)
  selectedIds = [],
  onSelectedChange,

  // rol opcional
  roleOverride,
}) {
  // 1) Normalizamos fuente de datos (sin tocar estructura)
  const source = useMemo(() => {
    if (Array.isArray(reservas) && reservas.length) return reservas;
    if (Array.isArray(data) && data.length) return data;
    return Array.isArray(reservas) ? reservas : Array.isArray(data) ? data : [];
  }, [reservas, data]);

  // 2) Armamos índices para resolver nombres/precios (aceptamos arrays o maps)
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

  // 3) Enriquecemos cada fila con los campos que el preset ya sabe leer
  const rows = useMemo(() => {
    if (!source?.length) return [];
    const ctx = { clientesById: idxClientes, inmobiliariasById: idxInmobs, lotesById: idxLotes };
    return source.map((r) => enrichRow(r, ctx));
  }, [source, idxClientes, idxInmobs, idxLotes]);

  // 4) Auth / RBAC (igual que en otros módulos)
  let authUser = null;
  try {
    const auth = useAuth?.();
    authUser = auth?.user || null;
  } catch {
    authUser = null;
  }
  const can = (perm) => canDashboardAction?.(authUser, perm) === true;

  // 5) Columnas visibles por defecto: PRIMERAS 7 del preset (fechaCreación queda disponible)
  const defaultVisibleIds = useMemo(() => {
    const all = tablePreset.columns.map((c) => c.id);
    return all.slice(0, 7);
  }, []);

  // 5.1 Forzar alineación global de columnas para esta tabla (sin tocar preset)
  const FORCE_ALIGN = 'center';   // ← Cambiá a 'left' si querés todo a la izquierda
  const columnsAligned = useMemo(
    () => tablePreset.columns.map((c) => ({ ...c, align: FORCE_ALIGN })),
    [/* depende solo de FORCE_ALIGN si lo cambiás arriba */]
  );

  // 6) Toolbar derecha (sin cambios visuales)
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

  // 7) Acciones por fila (respeta RBAC)
  const renderRowActions = (row) => (
    <div className="tl-actions">
      {can('visualizarReserva') && (
        <button
          className="tl-icon tl-icon--view"
          aria-label="Ver Reserva"
          data-tooltip="Ver Reserva"
          onClick={() => onVer?.(row)}
        >
          <Eye size={18} strokeWidth={2} />
        </button>
      )}

      {can('editarReserva') && (
        <button
          className="tl-icon tl-icon--edit"
          aria-label="Editar Reserva"
          data-tooltip="Editar Reserva"
          onClick={() => onEditar?.(row)}
        >
          <Edit size={18} strokeWidth={2} />
        </button>
      )}

      {can('verDocumentos') && (
        <button
          className="tl-icon tl-icon--docs"
          aria-label="Ver Documentos"
          data-tooltip="Ver Documentos"
          onClick={() => onVerDocumentos?.(row)}
        >
          <FileText size={18} strokeWidth={2} />
        </button>
      )}

      {can('eliminarReserva') && (
        <button
          className="tl-icon tl-icon--delete"
          aria-label="Eliminar Reserva"
          data-tooltip="Eliminar Reserva"
          onClick={() => onEliminar?.(row)}
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );

  // 8) Render
  return (
    <TablaBase
      rows={rows}
      rowKey="id"
      columns={columnsAligned}            
      widthFor={tablePreset.widthFor}
      defaultVisibleIds={defaultVisibleIds} // 7 por defecto
      maxVisible={7}                        // no permite activar una 8va
      renderRowActions={renderRowActions}
      toolbarRight={toolbarRight}
      defaultPageSize={25}
      selected={selectedIds}
      onSelectedChange={onSelectedChange}
    />
  );
}
