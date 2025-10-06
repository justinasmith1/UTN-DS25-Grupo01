// src/components/Table/TablaReservas/presets/reservas.table.jsx
// Preset de configuración para la tabla de reservas

import { fmtMoney, fmtFecha, fmtClienteCompleto } from '../utils/formatters';

export const reservasTablePreset = {
  // Columnas de la tabla
  columns: [
    {
      id: 'id',
      titulo: 'ID',
      accessorKey: 'id',
      width: '80px',
      align: 'center'
    },
    {
      id: 'loteInfo',
      titulo: 'Lote',
      accessor: (row) => {
        if (!row.loteInfo) return '—';
        const { fraccion, calle, numero } = row.loteInfo;
        return `${fraccion} - ${calle} ${numero}`;
      },
      width: '150px'
    },
    {
      id: 'clienteCompleto',
      titulo: 'Cliente',
      accessor: (row) => fmtClienteCompleto(row),
      width: '200px'
    },
    {
      id: 'fechaReserva',
      titulo: 'Fecha Reserva',
      accessor: (row) => fmtFecha(row.fechaReserva),
      width: '130px',
      align: 'center'
    },
    {
      id: 'seña',
      titulo: 'Seña',
      accessor: (row) => fmtMoney(row.seña),
      width: '120px',
      align: 'right'
    },
    {
      id: 'inmobiliariaNombre',
      titulo: 'Inmobiliaria',
      accessorKey: 'inmobiliariaNombre',
      width: '180px'
    },
    {
      id: 'lotePrecio',
      titulo: 'Precio Lote',
      accessor: (row) => {
        if (!row.loteInfo?.precio) return '—';
        return fmtMoney(row.loteInfo.precio);
      },
      width: '120px',
      align: 'right'
    },
    {
      id: 'createdAt',
      titulo: 'Fecha Creación',
      accessor: (row) => fmtFecha(row.createdAt),
      width: '130px',
      align: 'center'
    }
  ],

  // Anchos por defecto
  defaultWidths: {
    id: '80px',
    loteInfo: '150px',
    clienteCompleto: '200px',
    fechaReserva: '130px',
    seña: '120px',
    inmobiliariaNombre: '180px',
    lotePrecio: '120px',
    createdAt: '130px'
  },

  // Columnas ocultas por defecto
  defaultHiddenColumns: [
    'createdAt'
  ],

  // Accessors para filtrado y ordenamiento
  accessors: {
    id: (row) => row.id,
    loteInfo: (row) => row.loteInfo ? `${row.loteInfo.fraccion} - ${row.loteInfo.calle} ${row.loteInfo.numero}` : '',
    clienteCompleto: (row) => fmtClienteCompleto(row),
    fechaReserva: (row) => new Date(row.fechaReserva).getTime(),
    seña: (row) => Number(row.seña) || 0,
    inmobiliariaNombre: (row) => row.inmobiliariaNombre || '',
    lotePrecio: (row) => Number(row.loteInfo?.precio) || 0,
    createdAt: (row) => new Date(row.createdAt).getTime()
  },

  // Configuración de acciones
  actions: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canCreate: true
  },

  // Configuración de selección
  selectable: true,
  multiSelect: true,

  // Configuración de paginación
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],

  // Configuración de ordenamiento
  defaultSortBy: 'fechaReserva',
  defaultSortDir: 'desc'
};
