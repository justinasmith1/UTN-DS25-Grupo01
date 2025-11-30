// src/components/Table/TablaReservas/presets/reservas.table.jsx
import { fmtFecha } from '../utils/formatters';

const getClienteNombre = (row) => {
  if (row?.cliente?.nombre || row?.cliente?.apellido) {
    const n = row.cliente.nombre ?? '';
    const a = row.cliente.apellido ?? '';
    const full = `${n} ${a}`.trim();
    return full || null;
  }
  return row?.clienteNombre ?? null;
};

const getInmobiliariaNombre = (row) => {
  const nombre = row?.inmobiliaria?.nombre ?? row?.inmobiliariaNombre ?? null;
  return nombre || 'La Federala';
};

const getLotePrecio = (row) =>
  row?.lote?.precio ?? row?.lotePrecio ?? null;

const getFechaReserva = (row) =>
  row?.fechaReserva ?? row?.fecha_reserva ?? row?.fecha ?? null;

export const reservasTablePreset = {
  columns: [
    { id: 'id', titulo: 'ID', accessor: (r) => r?.numero ?? r?.id ?? '—', width: '120px', align: 'center' },

    // Lote: si solo viene el id, mostramos el id.
    {
      id: 'loteInfo',
      titulo: 'Lote',
      accessor: (r) => r?.lote?.mapId ?? r?.lotMapId ?? r?.loteInfo?.mapId ?? r?.loteId ?? '—',
      width: '120px'
    },

    // Cliente: nombre y apellido desde row.cliente
    {
      id: 'clienteCompleto',
      titulo: 'Cliente',
      accessor: (r) => getClienteNombre(r) ?? '—',
      width: '220px'
    },

    // Fecha Reserva en una sola línea
    {
      id: 'fechaReserva',
      titulo: 'Fecha Reserva',
      accessor: (r) => (getFechaReserva(r) ? new Date(getFechaReserva(r)).toLocaleDateString('es-AR') : '—'),
      width: '140px'
    },

    // Seña: vuelve a guion simple si falta
    {
      id: 'seña',
      titulo: 'Seña',
      accessor: (r) => {
        const v = r?.senia ?? r?.sena ?? r?.seña ?? null;
        if (v == null || v === '') return '—';
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(v));
      },
      width: '120px',
      align: 'right'
    },

    // Inmobiliaria
    {
      id: 'inmobiliariaNombre',
      titulo: 'Inmobiliaria',
      accessor: (r) => getInmobiliariaNombre(r),
      width: '200px'
    },

    // Precio Lote
    {
      id: 'lotePrecio',
      titulo: 'Precio Lote',
      accessor: (r) => {
        const v = getLotePrecio(r);
        if (v == null || v === '') return '—';
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(v));
      },
      width: '130px',
      align: 'right'
    },

    // La columna sigue existiendo (no la oculto)
    {
      id: 'createdAt',
      titulo: 'Fecha Creación',
      accessor: (r) => (r?.createdAt ? new Date(r.createdAt).toLocaleDateString('es-AR') : '—'),
      width: '130px'
    },
  ],

  // Para ordenar/filtrar con consistencia
  accessors: {
    id: (r) => r.id,
    loteInfo: (r) =>
      String(
        r?.lote?.mapId ??
          r?.lotMapId ??
          r?.loteInfo?.mapId ??
          r?.loteId ??
          ''
      ),
    clienteCompleto: (r) => String(getClienteNombre(r) ?? ''),
    fechaReserva: (r) => (getFechaReserva(r) ? new Date(getFechaReserva(r)).getTime() : 0),
    seña: (r) => Number(r?.senia ?? r?.sena ?? r?.seña ?? 0),
    inmobiliariaNombre: (r) => String(getInmobiliariaNombre(r) ?? ''),
    lotePrecio: (r) => Number(getLotePrecio(r) ?? 0),
    createdAt: (r) => (r?.createdAt ? new Date(r.createdAt).getTime() : 0),
  },

  // anchos por id
  widthFor: (id) => {
    const W = {
      id: '120px',
      loteInfo: '120px',
      clienteCompleto: '220px',
      fechaReserva: '140px',
      seña: '120px',
      inmobiliariaNombre: '200px',
      lotePrecio: '130px',
      createdAt: '130px',
    };
    return W[id] || 'minmax(120px, 1fr)';
  },

  // resto igual a como lo tenías…
  selectable: true,
  multiSelect: true,
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
  defaultSortBy: 'fechaReserva',
  defaultSortDir: 'desc',
};
